[CmdletBinding()]
param([switch]$RequireSignature)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Assert-Tool {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required tool was not found in PATH: $Name"
  }
}

function Assert-File {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Required file was not found: $Path"
  }
}

function Assert-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    throw "Required directory was not found: $Path"
  }
}

function Assert-NoDynamicMsvcRuntime {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )

  Assert-File $Path
  $binaryText = [System.Text.Encoding]::ASCII.GetString(
    [System.IO.File]::ReadAllBytes($Path)
  )
  $pattern = '(?i)(?:VCRUNTIME|MSVCP|CONCRT|MSVCR)[A-Z0-9_]*\.dll'
  $dependencies = @(
    [System.Text.RegularExpressions.Regex]::Matches($binaryText, $pattern) |
      ForEach-Object { $_.Value.ToUpperInvariant() } |
      Sort-Object -Unique
  )
  if ($dependencies.Count -gt 0) {
    throw "$Label depends on the Visual C++ Redistributable: $($dependencies -join ', '). The release must use a statically linked MSVC CRT."
  }
  Write-Host "$Label CRT dependency check: self-contained" -ForegroundColor Green
}

function Assert-PathUnder {
  param(
    [string]$Path,
    [string]$Parent
  )
  $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
  $fullParent = [System.IO.Path]::GetFullPath($Parent).TrimEnd('\')
  $prefix = "$fullParent\"
  if (-not $fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path must stay inside $fullParent`: $fullPath"
  }
}

function Copy-DirectoryContents {
  param(
    [string]$Source,
    [string]$Destination
  )
  Assert-Directory $Source
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Get-ChildItem -LiteralPath $Source -Force |
    Copy-Item -Destination $Destination -Recurse -Force
}

function Copy-ReleaseProjectSnapshot {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string[]]$ExcludedDirectories = @()
  )

  Assert-Directory $Source
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null

  $robocopyArguments = @(
    $Source,
    $Destination,
    "/E",
    "/COPY:DAT",
    "/DCOPY:DAT",
    "/R:2",
    "/W:1",
    "/XJ",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP"
  )
  if ($ExcludedDirectories.Count -gt 0) {
    $robocopyArguments += "/XD"
    $robocopyArguments += @($ExcludedDirectories | ForEach-Object {
      [System.IO.Path]::GetFullPath((Join-Path $Source $_))
    })
  }

  & robocopy @robocopyArguments
  $robocopyExitCode = $LASTEXITCODE
  # Robocopy uses 0-7 for successful copy states (including copied files and
  # harmless source/destination differences); 8 and above are failures.
  if ($robocopyExitCode -ge 8) {
    throw "robocopy failed to snapshot $Source with exit code $robocopyExitCode"
  }
}

function Copy-FileWithRetry {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [int]$Attempts = 20,
    [int]$DelayMilliseconds = 500
  )

  $lastError = $null
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      Copy-Item -LiteralPath $Source -Destination $Destination -Force -ErrorAction Stop
      return $true
    } catch {
      $lastError = $_
      if ($attempt -eq $Attempts) {
        break
      }
      Start-Sleep -Milliseconds $DelayMilliseconds
    }
  }

  if (Test-Path -LiteralPath $Destination -PathType Leaf) {
    try {
      $stream = [System.IO.File]::Open(
        $Destination,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None
      )
      $stream.Dispose()
    } catch [System.IO.IOException] {
      return $false
    }
  }

  throw $lastError
}

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
$protocolDir = Join-Path $workspaceRoot "tuget-protocol"
$proDir = Join-Path $workspaceRoot "Pro-GetPic"
$browserDir = Join-Path $workspaceRoot "browser"
$hostDir = Join-Path $workspaceRoot "tuget-native-host"
$clientDir = Join-Path $workspaceRoot "TuGet-Client"
$clientTauriDir = Join-Path $clientDir "src-tauri"
$releaseTauriConfig = Join-Path $clientTauriDir "tauri.release.conf.json"
$windowsTauriConfig = Join-Path $clientTauriDir "tauri.windows.conf.json"
$releaseResourcesRoot = Join-Path $clientTauriDir "release-resources"
$browserStageDir = Join-Path $releaseResourcesRoot "browser-engine"
$cleanupScript = Join-Path $PSScriptRoot "clean-release-environment.ps1"

Write-Host "TuGet full release build" -ForegroundColor Green
Write-Host "Workspace: $workspaceRoot"
Write-Host "This command rebuilds every TuGet runtime component from current local source."

foreach ($tool in @("node", "npm", "cargo", "rustc", "pwsh", "robocopy")) {
  Assert-Tool $tool
}
foreach ($dir in @($protocolDir, $proDir, $browserDir, $hostDir, $clientDir)) {
  Assert-Directory $dir
}
Assert-File $cleanupScript
Assert-File $releaseTauriConfig
Assert-File $windowsTauriConfig

$signScript = Join-Path $browserDir 'scripts\sign.ps1'
$integrityScript = Join-Path $PSScriptRoot 'prepare-engine-release.ps1'
Assert-File $signScript
Assert-File $integrityScript
. (Join-Path $browserDir 'scripts\signature-policy.ps1')
$expectedSigner = Get-TuGetSignerThumbprint
$signingConfigured = -not [string]::IsNullOrWhiteSpace(
  (@($env:TUGET_SIGN_CERT_PATH, $env:TUGET_SIGN_CERT_SHA1, $env:GETPIC_SIGN_CERT_PATH, $env:GETPIC_SIGN_CERT_SHA1) -join '')
)
if ($RequireSignature -and -not $signingConfigured) {
  throw 'Release signing requires TUGET_SIGN_CERT_PATH or TUGET_SIGN_CERT_SHA1. No certificate is configured.'
}
if (-not $signingConfigured) { Write-Warning 'No release signing certificate configured; this build will be unsigned.' }
if ($signingConfigured -and -not $expectedSigner) { throw 'Set TUGET_SIGN_EXPECTED_THUMBPRINT when signing with a PFX certificate' }

# 图个吉利 HMAC 密钥：必须与服务端 server/.env 中 HMAC_SECRET_TUGET 的值完全一致。
# 优先读取当前环境变量；若未设置则尝试从 TuGet-Client/.env.local 或仓库根 .env.local 加载。
if ([string]::IsNullOrWhiteSpace($env:TUGET_LICENSE_HMAC_SECRET)) {
  foreach ($candidateEnv in @(
    (Join-Path $clientDir '.env.local'),
    (Join-Path $workspaceRoot '.env.local')
  )) {
    if (Test-Path -LiteralPath $candidateEnv -PathType Leaf) {
      foreach ($rawLine in (Get-Content -LiteralPath $candidateEnv -Encoding UTF8)) {
        $line = $rawLine.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { continue }
        $eqIdx = $line.IndexOf('=')
        if ($eqIdx -le 0) { continue }
        $key = $line.Substring(0, $eqIdx).Trim()
        $val = $line.Substring($eqIdx + 1).Trim().Trim('''', '"')
        if ($key -eq 'TUGET_LICENSE_HMAC_SECRET' -and -not [string]::IsNullOrWhiteSpace($val)) {
          $env:TUGET_LICENSE_HMAC_SECRET = $val
          break
        }
      }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:TUGET_LICENSE_HMAC_SECRET)) { break }
  }
}
if ([string]::IsNullOrWhiteSpace($env:TUGET_LICENSE_HMAC_SECRET)) {
  throw 'Missing required environment variable TUGET_LICENSE_HMAC_SECRET. Configure it in environment variables or .env.local before building a release.'
}

Write-Step "1/9 Clean TuGet install traces and old setup executables"
Invoke-Checked $workspaceRoot "pwsh" "-NoProfile" "-File" $cleanupScript

Write-Step "2/9 Reinstall tuget-protocol dependencies"
Invoke-Checked $protocolDir "npm" "ci"

Write-Step "3/9 Rebuild tuget-protocol"
Invoke-Checked $protocolDir "npm" "run" "build"

$releaseSnapshotRoot = Join-Path (
  [System.IO.Path]::GetTempPath()
) "tuget-release-$PID-$([System.Guid]::NewGuid().ToString('N'))"
Assert-PathUnder $releaseSnapshotRoot ([System.IO.Path]::GetTempPath())
$releaseProtocolDir = Join-Path $releaseSnapshotRoot "tuget-protocol"
$releaseProDir = Join-Path $releaseSnapshotRoot "Pro-GetPic"
$releaseDesktopExtensionDir = Join-Path $releaseProDir ".output\desktop-chrome-mv3"

try {
  Write-Step "4/9 Reinstall consumers from the freshly built protocol"
  Write-Host "Creating isolated Pro-GetPic release snapshot: $releaseSnapshotRoot" -ForegroundColor DarkGray
  Copy-ReleaseProjectSnapshot -Source $protocolDir -Destination $releaseProtocolDir -ExcludedDirectories @(
    ".git",
    "node_modules"
  )
  Copy-ReleaseProjectSnapshot -Source $proDir -Destination $releaseProDir -ExcludedDirectories @(
    ".git",
    "node_modules",
    ".output",
    ".wxt",
    ".desktop-build-hidden-entrypoints",
    "docs",
    "reference",
    "scratch",
    "tmp",
    "entrypoints\newtab",
    "entrypoints\desktop-download-offscreen"
  )

  Write-Host "npm ci (isolated snapshot): $releaseProDir" -ForegroundColor DarkGray
  Invoke-Checked $releaseProDir "npm" "ci"
  foreach ($dir in @($browserDir, $clientDir)) {
    Write-Host "npm ci: $dir" -ForegroundColor DarkGray
    Invoke-Checked $dir "npm" "ci"
  }

  Write-Step "5/9 Rebuild and synchronize Pro-GetPic desktop extension"
  Write-Host "Building the desktop variant without changing the live Pro-GetPic workspace." -ForegroundColor DarkGray
  Invoke-Checked $releaseProDir "npm" "run" "build:desktop"
  Assert-Directory $releaseDesktopExtensionDir
  Invoke-Checked $browserDir "pwsh" "-NoProfile" "-File" (Join-Path $browserDir "scripts\update-plugin.ps1") "-SourceDir" $releaseDesktopExtensionDir
} finally {
  if (Test-Path -LiteralPath $releaseSnapshotRoot) {
    Remove-Item -LiteralPath $releaseSnapshotRoot -Recurse -Force
    Write-Host "Removed isolated Pro-GetPic release snapshot." -ForegroundColor DarkGray
  }
}

Write-Step "6/9 Clean and rebuild Browser Engine"
Invoke-Checked $browserDir "cargo" "clean" "--manifest-path" (Join-Path $browserDir "Cargo.toml")
Invoke-Checked $browserDir "cargo" "build" "--manifest-path" (Join-Path $browserDir "Cargo.toml") "--release" "--locked"
Invoke-Checked $browserDir "npm" "run" "verify"

Write-Step "7/9 Clean and rebuild Native Host"
Invoke-Checked $hostDir "cargo" "clean" "--manifest-path" (Join-Path $hostDir "Cargo.toml")
Invoke-Checked $hostDir "cargo" "build" "--manifest-path" (Join-Path $hostDir "Cargo.toml") "--release" "--locked"

$browserExe = Join-Path $browserDir "target\release\tuget-browser.exe"
$nativeHostExe = Join-Path $hostDir "target\release\tuget-native-host.exe"
Assert-NoDynamicMsvcRuntime -Path $browserExe -Label "Browser Engine"
Assert-NoDynamicMsvcRuntime -Path $nativeHostExe -Label "Native Host"

Write-Step "8/9 Stage complete packaged runtime"
Assert-PathUnder $browserStageDir $releaseResourcesRoot
if (Test-Path -LiteralPath $browserStageDir) {
  Remove-Item -LiteralPath $browserStageDir -Recurse -Force
}
New-Item -ItemType Directory -Path $browserStageDir -Force | Out-Null

$chromiumDir = Join-Path $browserDir "chromium"
$extensionDir = Join-Path $browserDir "extensions\pro-getpic"
$licensesDir = Join-Path $browserDir "licenses"
Assert-File $browserExe
Assert-File $nativeHostExe
Assert-File (Join-Path $chromiumDir "chrome.exe")
Assert-File (Join-Path $extensionDir "manifest.json")

Copy-Item -LiteralPath $browserExe -Destination (Join-Path $browserStageDir "tuget-browser.exe") -Force
Copy-Item -LiteralPath $nativeHostExe -Destination (Join-Path $browserStageDir "tuget-native-host.exe") -Force
Copy-Item -LiteralPath (Join-Path $browserDir "chromium-version.json") -Destination $browserStageDir -Force
Copy-DirectoryContents $chromiumDir (Join-Path $browserStageDir "chromium")
Copy-DirectoryContents $extensionDir (Join-Path $browserStageDir "extensions\pro-getpic")
Copy-DirectoryContents $licensesDir (Join-Path $browserStageDir "licenses")

$integrityArguments = @('-NoProfile', '-File', $integrityScript, '-EngineDirectory', $browserStageDir)
if ($signingConfigured) { $integrityArguments += '-Sign' }
if ($RequireSignature) { $integrityArguments += '-RequireSignature' }
Invoke-Checked $workspaceRoot 'pwsh' @integrityArguments

$extensionManifest = Get-Content -LiteralPath (Join-Path $extensionDir "manifest.json") -Raw | ConvertFrom-Json
$extensionMarker = Get-Content -LiteralPath (Join-Path $extensionDir "tuget-build.json") -Raw | ConvertFrom-Json
$stagedInventory = Get-Content -LiteralPath (Join-Path $browserStageDir 'engine-integrity.json') -Raw | ConvertFrom-Json
$ownedSignatures = @($stagedInventory.signatures | Where-Object { $_.path -in @('tuget-browser.exe', 'tuget-native-host.exe') })
$releaseMetadata = [ordered]@{
  schemaVersion = 1
  integrityManifest = 'engine-integrity.json'
  tugetComponentsSigned = $ownedSignatures.Count -eq 2 -and @($ownedSignatures | Where-Object { -not $_.tugetPublisherVerified }).Count -eq 0
  clientVersion = (Get-Content -LiteralPath (Join-Path $clientTauriDir "tauri.conf.json") -Raw | ConvertFrom-Json).version
  browserVersion = (Get-Content -LiteralPath (Join-Path $browserDir "package.json") -Raw | ConvertFrom-Json).version
  extensionVersion = $extensionManifest.version
  extensionBuildMode = $extensionMarker.buildMode
  protocolVersion = $extensionMarker.protocolVersion
  builtAt = (Get-Date).ToUniversalTime().ToString("o")
}
$releaseMetadata | ConvertTo-Json -Depth 10 |
  Set-Content -LiteralPath (Join-Path $browserStageDir "release-manifest.json") -Encoding UTF8

$stageSize = (Get-ChildItem -LiteralPath $browserStageDir -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("Staged runtime: {0:N2} MB" -f ($stageSize / 1MB)) -ForegroundColor Green

Write-Step "9/9 Build the NSIS setup executable"
$buildArguments = @('run', 'tauri', '--', 'build', '--config', $releaseTauriConfig, '--config', $windowsTauriConfig)
$signingConfig = $null
try {
  if ($signingConfigured) {
    $signingConfig = Join-Path ([IO.Path]::GetTempPath()) "tuget-signing-$([Guid]::NewGuid().ToString('N')).json"
    # Object notation preserves spaces in paths; secrets stay in the environment.
    @{ bundle = @{ windows = @{ signCommand = @{ cmd = 'pwsh'; args = @('-NoProfile', '-File', $signScript, '-FilePath', '%1') } } } } |
      ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $signingConfig -Encoding utf8NoBOM
    $buildArguments += @('--config', $signingConfig)
  }
  Invoke-Checked $clientDir 'npm' @buildArguments
} finally {
  if ($signingConfig -and (Test-Path -LiteralPath $signingConfig)) { Remove-Item -LiteralPath $signingConfig -Force }
}

$nsisDir = Join-Path $clientTauriDir "target\release\bundle\nsis"
$stableInstallerPath = Join-Path $nsisDir "TuGet-Setup.exe"
$installer = Get-ChildItem -LiteralPath $nsisDir -File -Filter "*-setup.exe" |
  Where-Object { -not [string]::Equals($_.FullName, $stableInstallerPath, [System.StringComparison]::OrdinalIgnoreCase) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $installer) {
  throw "Tauri completed without producing an NSIS setup executable in $nsisDir"
}

if ($signingConfigured) {
  foreach ($path in @($installer.FullName, (Join-Path $clientTauriDir 'target\release\tuget-client.exe'))) {
    Assert-TuGetSignature -Signature (Get-AuthenticodeSignature -LiteralPath $path) -ExpectedThumbprint $expectedSigner -Label $path
  }
}

$stableInstallerUpdated = Copy-FileWithRetry -Source $installer.FullName -Destination $stableInstallerPath
$installerHash = (Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256).Hash

$toolsDir = Join-Path $workspaceRoot "tools"
$toolsInstallerPath = $null
if (Test-Path -LiteralPath $toolsDir -PathType Container) {
  $toolsDownloadDir = Join-Path $toolsDir "public\downloads\TuGet-Client"
  New-Item -ItemType Directory -Path $toolsDownloadDir -Force | Out-Null
  $toolsInstallerPath = Join-Path $toolsDownloadDir "TuGet-Setup.exe"
  # Copy this build directly: the stable installer may still be locked by Windows.
  if (-not (Copy-FileWithRetry -Source $installer.FullName -Destination $toolsInstallerPath)) {
    throw "The tools installer is in use and could not be updated: $toolsInstallerPath"
  }
  if ((Get-FileHash -LiteralPath $toolsInstallerPath -Algorithm SHA256).Hash -ne $installerHash) {
    throw "The tools installer does not match the current build: $toolsInstallerPath"
  }
} else {
  Write-Warning "tools project not found, skipping installer sync: $toolsDir"
}

$tugetWebsiteVersionJson = Join-Path $workspaceRoot "tuget-website\public\version.json"
$currentClientVersion = (Get-Content -LiteralPath (Join-Path $clientTauriDir "tauri.conf.json") -Raw | ConvertFrom-Json).version
if (Test-Path -LiteralPath $tugetWebsiteVersionJson -PathType Leaf) {
  $versionManifest = Get-Content -LiteralPath $tugetWebsiteVersionJson -Raw -Encoding UTF8 | ConvertFrom-Json
  $versionManifest.desktopVersion = $currentClientVersion
  $versionManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $tugetWebsiteVersionJson -Encoding utf8NoBOM
  Write-Host "Updated tuget-website version.json desktopVersion -> $currentClientVersion" -ForegroundColor Green
} else {
  Write-Warning "tuget-website version.json not found, skipping version sync: $tugetWebsiteVersionJson"
}

$mainWebsiteTugetJson = Join-Path $workspaceRoot "website\public\tuget-version.json"
if (Test-Path -LiteralPath $mainWebsiteTugetJson -PathType Leaf) {
  $mainTugetManifest = Get-Content -LiteralPath $mainWebsiteTugetJson -Raw -Encoding UTF8 | ConvertFrom-Json
  $mainTugetManifest.version = $currentClientVersion
  $mainTugetManifest.desktopUpdatedAt = (Get-Date).ToString("yyyy-MM-dd")
  $mainTugetManifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $mainWebsiteTugetJson -Encoding utf8NoBOM
  Write-Host "Updated website/public/tuget-version.json version -> $currentClientVersion" -ForegroundColor Green
}

Write-Host ""
Write-Host "TuGet release build completed" -ForegroundColor Green
if ($stableInstallerUpdated) {
  Write-Host "Stable installer: $stableInstallerPath"
} else {
  Write-Warning "Windows is still using the previous $stableInstallerPath, so the convenience copy could not be refreshed. Use the versioned installer below; it is the completed current build."
}
Write-Host "Versioned installer: $($installer.FullName)"
if ($toolsInstallerPath) {
  Write-Host "Tools installer: $toolsInstallerPath"
}
Write-Host ("Size: {0:N2} MB" -f ($installer.Length / 1MB))
Write-Host "SHA256: $installerHash"
Write-Host ""
Write-Host "Next steps to publish the update:" -ForegroundColor Yellow
Write-Host "  1. Upload TuGet-Setup.exe to Cloudflare R2 (r2-downloads-sync) BEFORE deploying version.json"
Write-Host "  2. Deploy tuget-website (website-deploy) so https://tuget.yueding168.com/version.json goes live"
Write-Host "  3. After Microsoft Store certification passes, update microsoftStoreVersion in version.json"
