<#
.SYNOPSIS
  TuGet-Client 一键开发启动脚本
  自动构建所有配合项目并启动 Tauri 开发服务器。

.DESCRIPTION
  依赖链：
    tuget-protocol → browser → tuget-native-host → TuGet-Client
    Pro-GetPic desktop 构建输入变化时执行 build:desktop → browser (update-plugin + verify)
    TuGet-Client 使用 npm run dev:client 启动。

  默认比较 Pro-GetPic desktop 构建输入的内容指纹；内容未变时复用 browser 中现有插件，
  内容变化时自动构建、同步和校验。使用 -UpdatePlugin 可无条件刷新插件链。
  如果 browser 中还没有插件，首次启动会自动完成插件构建和同步。

.PARAMETER Rebuild
  强制重建所有项目产物（不跳过已存在的构建结果），包含插件链。

.PARAMETER UpdatePlugin
  无条件构建最新 Pro-GetPic desktop 插件，同步到 browser 并校验，不强制重建 browser 程序。

.PARAMETER SkipBrowser
  跳过 browser 引擎构建（如果你确定 browser 已是最新）。
  注意：与 -UpdatePlugin 一起使用时，仍会同步插件，只跳过 cargo build --release。

.PARAMETER SkipRegister
  跳过 Native Host 注册检查。

.PARAMETER Check
  仅检查环境、项目路径和必要构建命令，不执行构建、注册或启动。

.EXAMPLE
  .\scripts\clients\tuget\启动完整开发环境.ps1
  .\scripts\clients\tuget\启动完整开发环境.ps1 -Rebuild
  .\scripts\clients\tuget\启动完整开发环境.ps1 -UpdatePlugin
  .\scripts\clients\tuget\启动完整开发环境.ps1 -SkipBrowser
  .\scripts\clients\tuget\启动完整开发环境.ps1 -Check
#>
param(
  [switch]$Rebuild,
  [Alias("RebuildPlugin")]
  [switch]$UpdatePlugin,
  [switch]$SkipBrowser,
  [switch]$SkipRegister,
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

# ── PATH ──────────────────────────────────────────────────────────────────────
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

function Write-Step([string]$msg)  { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok([string]$msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Skip([string]$msg)  { Write-Host "  [SKIP] $msg" -ForegroundColor DarkGray }
function Write-Info([string]$msg)  { Write-Host "  [INFO] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg)  { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

$licenseEnvironmentScript = Join-Path $PSScriptRoot "configure-license-development.ps1"
if (-not (Test-Path -LiteralPath $licenseEnvironmentScript -PathType Leaf)) {
  Write-Fail "缺少开发授权配置脚本: $licenseEnvironmentScript"
  exit 1
}
. $licenseEnvironmentScript
try {
  $licenseEnvironment = Set-TuGetDevelopmentLicenseEnvironment -WorkspaceRoot $Root
} catch {
  Write-Fail $_.Exception.Message
  exit 1
}
Write-Ok "开发授权服务: $($licenseEnvironment.ServerUrl)"
Write-Ok "开发授权密钥已从 $($licenseEnvironment.SecretSource) 注入（不显示密钥）"

function Test-Command([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-SourceNewerThanArtifact([string[]]$SourcePaths, [string]$ArtifactPath) {
  if (-not (Test-Path -LiteralPath $ArtifactPath -PathType Leaf)) { return $true }
  $artifactTime = (Get-Item -LiteralPath $ArtifactPath).LastWriteTimeUtc
  foreach ($sourcePath in $SourcePaths) {
    if (-not (Test-Path -LiteralPath $sourcePath)) { continue }
    $item = Get-Item -LiteralPath $sourcePath
    if (-not $item.PSIsContainer) {
      if ($item.LastWriteTimeUtc -gt $artifactTime) { return $true }
      continue
    }
    $newer = Get-ChildItem -LiteralPath $sourcePath -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTimeUtc -gt $artifactTime } |
      Select-Object -First 1
    if ($newer) { return $true }
  }
  return $false
}

function Test-ValidFingerprintState([object]$State) {
  return $null -ne $State -and
    [int]$State.schemaVersion -eq 1 -and
    [string]$State.algorithm -eq "sha256" -and
    ([string]$State.fingerprint) -match '^[a-fA-F0-9]{64}$' -and
    [int]$State.fileCount -ge 1
}

function Invoke-NodeFingerprintScript([string]$FingerprintScript, [string]$Label) {
  if (-not (Test-Path -LiteralPath $FingerprintScript -PathType Leaf)) {
    throw "缺少${Label}指纹脚本: $FingerprintScript"
  }

  $rawOutput = @(& node $FingerprintScript)
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "${Label}指纹计算失败（exit code: $exitCode）"
  }

  try {
    $state = ($rawOutput -join "`n") | ConvertFrom-Json
  } catch {
    throw "${Label}指纹脚本输出了无效 JSON: $($_.Exception.Message)"
  }

  if (-not (Test-ValidFingerprintState $state)) {
    throw "${Label}指纹脚本输出无效"
  }

  return $state
}

function Get-ProGetPicSourceFingerprint([string]$ProjectDir) {
  $fingerprintScript = Join-Path $ProjectDir "tuget-client-integration\build\desktop-source-fingerprint.js"
  return Invoke-NodeFingerprintScript $fingerprintScript "Pro-GetPic desktop 构建输入"
}

function Get-TugetProtocolSourceFingerprint([string]$ProjectDir) {
  $fingerprintScript = Join-Path $ProjectDir "scripts\source-fingerprint.mjs"
  return Invoke-NodeFingerprintScript $fingerprintScript "tuget-protocol 源码"
}

function Get-NpmDependencyFingerprint([string]$ProjectDir) {
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  $stream = [System.IO.MemoryStream]::new()
  try {
    foreach ($name in @("package.json", "package-lock.json")) {
      $filePath = Join-Path $ProjectDir $name
      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        throw "npm 依赖指纹缺少文件: $filePath"
      }

      $nameBytes = [System.Text.Encoding]::UTF8.GetBytes($name)
      $contentBytes = [System.IO.File]::ReadAllBytes($filePath)
      $lengthBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$contentBytes.Length)
      $separator = [byte[]](0)
      $stream.Write($nameBytes, 0, $nameBytes.Length)
      $stream.Write($separator, 0, $separator.Length)
      $stream.Write($lengthBytes, 0, $lengthBytes.Length)
      $stream.Write($separator, 0, $separator.Length)
      $stream.Write($contentBytes, 0, $contentBytes.Length)
      $stream.Write($separator, 0, $separator.Length)
    }

    return -join ($sha256.ComputeHash($stream.ToArray()) | ForEach-Object { $_.ToString('x2') })
  } finally {
    $stream.Dispose()
    $sha256.Dispose()
  }
}

function Test-NodeSpecifiersResolvable {
  param(
    [string]$ProjectDir,
    [string[]]$Specifiers = @(),
    [ValidateSet("import", "require")]
    [string]$ResolutionMode = "import"
  )

  if ($Specifiers.Count -eq 0) { return $true }

  Push-Location $ProjectDir
  try {
    foreach ($specifier in $Specifiers) {
      if ($ResolutionMode -eq "require") {
        & node -e "require.resolve(process.argv[1])" $specifier *> $null
      } else {
        & node --input-type=module -e "import.meta.resolve(process.argv[1])" $specifier *> $null
      }
      if ($LASTEXITCODE -ne 0) { return $false }
    }
  } finally {
    Pop-Location
  }

  return $true
}

function Wait-NodeSpecifiersResolvable {
  param(
    [string]$ProjectDir,
    [string[]]$Specifiers = @(),
    [ValidateSet("import", "require")]
    [string]$ResolutionMode = "import",
    [int]$Attempts = 20
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    if (Test-NodeSpecifiersResolvable -ProjectDir $ProjectDir -Specifiers $Specifiers -ResolutionMode $ResolutionMode) {
      return $true
    }
    if ($attempt -lt $Attempts) { Start-Sleep -Milliseconds 250 }
  }
  return $false
}

function Test-InstalledWorkspaceProtocol {
  param(
    [string]$ProjectDir,
    [string]$WorkspaceProtocolDir
  )

  if ([string]::IsNullOrWhiteSpace($WorkspaceProtocolDir)) { return $true }

  $installedProtocolDir = Join-Path $ProjectDir "node_modules\@tuget\protocol"
  if (-not (Test-Path -LiteralPath $installedProtocolDir -PathType Container)) { return $false }

  # file: 依赖必须安装成 node_modules 内的实体包。Windows junction 在协议重建和
  # npm reify 的时间窗口中会让 Node/Vite 间歇性看不到 exports 或 dist。
  $installedItem = Get-Item -LiteralPath $installedProtocolDir -Force
  if ($installedItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }

  $relativeRequiredFiles = @(
    "package.json",
    "dist\source-fingerprint.json",
    "dist\src\index.js",
    "dist\src\identity.js",
    "dist\src\dto.js",
    "dist\src\version.js"
  )
  foreach ($relativePath in $relativeRequiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $installedProtocolDir $relativePath) -PathType Leaf)) {
      return $false
    }
  }

  $workspaceMarker = Join-Path $WorkspaceProtocolDir "dist\source-fingerprint.json"
  $installedMarker = Join-Path $installedProtocolDir "dist\source-fingerprint.json"
  if (-not (Test-Path -LiteralPath $workspaceMarker -PathType Leaf)) { return $false }
  return (Get-Content -LiteralPath $installedMarker -Raw).Trim() -eq
    (Get-Content -LiteralPath $workspaceMarker -Raw).Trim()
}

function Sync-WorkspaceProtocolPackage {
  param(
    [string]$ProjectDir,
    [string]$WorkspaceProtocolDir
  )

  if ([string]::IsNullOrWhiteSpace($WorkspaceProtocolDir)) { return $true }

  $projectFullPath = [IO.Path]::GetFullPath($ProjectDir).TrimEnd('\', '/')
  $nodeModulesFullPath = [IO.Path]::GetFullPath((Join-Path $projectFullPath "node_modules"))
  $installedProtocolDir = [IO.Path]::GetFullPath((Join-Path $nodeModulesFullPath "@tuget\protocol"))
  $nodeModulesPrefix = $nodeModulesFullPath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  if (-not $installedProtocolDir.StartsWith($nodeModulesPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Fail "拒绝同步到 node_modules 之外的路径：$installedProtocolDir"
    return $false
  }
  if (-not (Test-Path -LiteralPath $installedProtocolDir -PathType Container)) { return $false }

  $installedItem = Get-Item -LiteralPath $installedProtocolDir -Force
  if ($installedItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Fail "@tuget/protocol 仍是 Windows 链接，无法安全同步：$installedProtocolDir"
    return $false
  }

  # npm 会将同版本 file: 依赖判定为 up to date，不会重新打包最新 dist。
  # 在确认目标是项目 node_modules 内的实体目录后，显式刷新协议产物。
  $installedDistDir = [IO.Path]::GetFullPath((Join-Path $installedProtocolDir "dist"))
  if (-not $installedDistDir.StartsWith($installedProtocolDir.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Fail "拒绝删除 @tuget/protocol 之外的 dist：$installedDistDir"
    return $false
  }
  if (Test-Path -LiteralPath $installedDistDir) {
    Remove-Item -LiteralPath $installedDistDir -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $WorkspaceProtocolDir "dist") -Destination $installedDistDir -Recurse -Force
  Copy-Item -LiteralPath (Join-Path $WorkspaceProtocolDir "package.json") -Destination (Join-Path $installedProtocolDir "package.json") -Force

  $workspaceSchemaDir = Join-Path $WorkspaceProtocolDir "schema"
  if (Test-Path -LiteralPath $workspaceSchemaDir -PathType Container) {
    Copy-Item -LiteralPath $workspaceSchemaDir -Destination $installedProtocolDir -Recurse -Force
  }
  $workspaceReadme = Join-Path $WorkspaceProtocolDir "README.md"
  if (Test-Path -LiteralPath $workspaceReadme -PathType Leaf) {
    Copy-Item -LiteralPath $workspaceReadme -Destination (Join-Path $installedProtocolDir "README.md") -Force
  }
  return $true
}

function Invoke-NpmInstallIfNeeded {
  param(
    [string]$ProjectDir,
    [string]$WorkspaceProtocolDir = "",
    [string[]]$RequiredNodeSpecifiers = @(),
    [ValidateSet("import", "require")]
    [string]$ResolutionMode = "import"
  )

  $nodeModulesDir = Join-Path $ProjectDir "node_modules"
  $markerPath = Join-Path $nodeModulesDir ".tuget-dependency-fingerprint"
  $expectedFingerprint = Get-NpmDependencyFingerprint $ProjectDir
  $fingerprintMatches =
    (Test-Path -LiteralPath $nodeModulesDir -PathType Container) -and
    (Test-Path -LiteralPath $markerPath -PathType Leaf) -and
    ((Get-Content -LiteralPath $markerPath -Raw).Trim() -eq $expectedFingerprint)
  $protocolPackageMatches = Test-InstalledWorkspaceProtocol `
    -ProjectDir $ProjectDir `
    -WorkspaceProtocolDir $WorkspaceProtocolDir
  $requiredDependenciesResolve =
    $protocolPackageMatches -and
    (Wait-NodeSpecifiersResolvable `
      -ProjectDir $ProjectDir `
      -Specifiers $RequiredNodeSpecifiers `
      -ResolutionMode $ResolutionMode `
      -Attempts 4)
  $repairingInvalidDependencies =
    (-not $protocolPackageMatches) -or
    ($RequiredNodeSpecifiers.Count -gt 0 -and -not $requiredDependenciesResolve)

  if ($fingerprintMatches -and $requiredDependenciesResolve) {
    Write-Skip "依赖与 package-lock.json 一致，跳过 npm install：$ProjectDir"
    return
  }

  if ($repairingInvalidDependencies) {
    Write-Info "本地协议依赖不是最新实体包或无法通过 $ResolutionMode 解析；执行确定性修复：$ProjectDir"
  }

  Push-Location $ProjectDir
  try {
    if (-not $fingerprintMatches) {
      Write-Info "依赖指纹变化或首次记录，执行 npm install：$ProjectDir"
    }
    # 增量安装不会像 npm ci 一样先删除可能正被 Vite/esbuild 占用的 Windows 可执行文件。
    # package.json 与 package-lock.json 都已纳入标记，安装后的真实状态会在下方重新计算。
    # 本地依赖损坏时先禁止生命周期脚本；否则 Pro-GetPic 的 postinstall 会在
    # @tuget/protocol 修复完成前启动 WXT，形成无法自愈的循环依赖。
    if ($repairingInvalidDependencies -and -not [string]::IsNullOrWhiteSpace($WorkspaceProtocolDir)) {
      npm install --install-links --ignore-scripts
    } elseif (-not [string]::IsNullOrWhiteSpace($WorkspaceProtocolDir)) {
      npm install --install-links
    } else {
      npm install
    }
    $installExitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($installExitCode -ne 0) {
    Write-Fail "npm install 失败：$ProjectDir"
    exit 1
  }

  if (-not (Sync-WorkspaceProtocolPackage -ProjectDir $ProjectDir -WorkspaceProtocolDir $WorkspaceProtocolDir)) {
    Write-Fail "无法将工作区 @tuget/protocol 同步到项目：$ProjectDir"
    exit 1
  }

  if (-not (Test-InstalledWorkspaceProtocol -ProjectDir $ProjectDir -WorkspaceProtocolDir $WorkspaceProtocolDir)) {
    Write-Fail "npm install 完成后 @tuget/protocol 仍不是与工作区匹配的实体包：$ProjectDir"
    exit 1
  }
  if (-not (Wait-NodeSpecifiersResolvable -ProjectDir $ProjectDir -Specifiers $RequiredNodeSpecifiers -ResolutionMode $ResolutionMode)) {
    Write-Fail "npm install 完成后本地依赖仍无法通过 $ResolutionMode 解析：$($RequiredNodeSpecifiers -join ', ')"
    exit 1
  }

  if ($repairingInvalidDependencies) {
    $projectPackage = Get-Content -LiteralPath (Join-Path $ProjectDir "package.json") -Raw | ConvertFrom-Json
    if ($projectPackage.scripts.postinstall) {
      Push-Location $ProjectDir
      try {
        Write-Info "本地依赖已修复，补执行 postinstall：$ProjectDir"
        npm run postinstall
        $postinstallExitCode = $LASTEXITCODE
      } finally {
        Pop-Location
      }
      if ($postinstallExitCode -ne 0) {
        Write-Fail "postinstall 失败：$ProjectDir"
        exit 1
      }
    }
  }

  # npm install 可能规范化 package-lock.json；只有依赖解析和生命周期脚本都通过后才落标记。
  $installedFingerprint = Get-NpmDependencyFingerprint $ProjectDir
  Set-Content -LiteralPath $markerPath -Value $installedFingerprint -Encoding ASCII -NoNewline
  Write-Ok "npm 依赖已与锁定文件同步"
}

# ── 前置检查 ──────────────────────────────────────────────────────────────────
Write-Step "前置环境检查"

if (-not (Test-Command "node")) {
  Write-Fail "未找到 node，请先安装 Node.js >= 22"; exit 1
}
if (-not (Test-Command "cargo")) {
  Write-Fail "未找到 cargo，请先安装 Rust (https://rustup.rs)"; exit 1
}
if (-not (Test-Command "npm")) {
  Write-Fail "未找到 npm"; exit 1
}

$nodeVer = (node -v) -replace '^v', ''
Write-Ok "Node $nodeVer / Rust $(rustc --version 2>$null | Select-String -Pattern '[\d.]+' | ForEach-Object { $_.Matches[0].Value })"

$requiredFiles = @(
  (Join-Path $Root "tuget-protocol\package.json"),
  (Join-Path $Root "tuget-protocol\scripts\source-fingerprint.mjs"),
  (Join-Path $Root "tuget-protocol\scripts\write-build-fingerprint.mjs"),
  (Join-Path $Root "Pro-GetPic\package.json"),
  (Join-Path $Root "Pro-GetPic\tuget-client-integration\build\desktop-source-fingerprint.js"),
  (Join-Path $Root "browser\package.json"),
  (Join-Path $Root "tuget-native-host\Cargo.toml"),
  (Join-Path $Root "tuget-native-host\scripts\check-dev.ps1"),
  (Join-Path $Root "tuget-native-host\scripts\register-dev.ps1"),
  (Join-Path $Root "TuGet-Client\package.json")
)
foreach ($requiredFile in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    Write-Fail "缺少工作区依赖文件: $requiredFile"
    exit 1
  }
}

$requiredNpmScripts = @(
  @{ Project = "tuget-protocol"; Names = @("build") },
  @{ Project = "Pro-GetPic"; Names = @("build:desktop") },
  @{ Project = "browser"; Names = @("update-plugin", "build", "verify") },
  @{ Project = "TuGet-Client"; Names = @("dev:client", "tauri") }
)
foreach ($requirement in $requiredNpmScripts) {
  $packagePath = Join-Path $Root "$($requirement.Project)\package.json"
  $packageJson = [System.IO.File]::ReadAllText($packagePath) | ConvertFrom-Json
  $availableScripts = @($packageJson.scripts.PSObject.Properties.Name)
  foreach ($scriptName in $requirement.Names) {
    if ($scriptName -notin $availableScripts) {
      Write-Fail "$($requirement.Project) 缺少 npm 脚本: $scriptName"
      exit 1
    }
  }
}

if ($Check) {
  Write-Ok "TuGet 完整开发环境脚本检查通过（工作区: $Root）"
  exit 0
}

# ── 插件状态 ──────────────────────────────────────────────────────────────────
$protoDir = Join-Path $Root "tuget-protocol"
$protoDist = Join-Path $protoDir "dist"
$protoBuildMarker = Join-Path $protoDist "source-fingerprint.json"
$requiredProtoArtifacts = @(
  (Join-Path $protoDir "dist\src\index.js"),
  (Join-Path $protoDir "dist\src\index.d.ts"),
  (Join-Path $protoDir "dist\src\identity.js"),
  (Join-Path $protoDir "dist\src\identity.d.ts"),
  (Join-Path $protoDir "dist\src\dto.js"),
  (Join-Path $protoDir "dist\src\dto.d.ts"),
  (Join-Path $protoDir "dist\src\version.js"),
  (Join-Path $protoDir "dist\src\version.d.ts")
)
$missingProtoArtifacts = @($requiredProtoArtifacts | Where-Object {
  -not (Test-Path -LiteralPath $_ -PathType Leaf)
})
try {
  $currentProtoSourceState = Get-TugetProtocolSourceFingerprint $protoDir
} catch {
  Write-Fail $_.Exception.Message
  exit 1
}

$protoSourceChanged = $true
if (Test-Path -LiteralPath $protoBuildMarker -PathType Leaf) {
  try {
    $builtProtoSourceState = Get-Content -LiteralPath $protoBuildMarker -Raw | ConvertFrom-Json
    if (Test-ValidFingerprintState $builtProtoSourceState) {
      $protoSourceChanged =
        [int]$builtProtoSourceState.schemaVersion -ne [int]$currentProtoSourceState.schemaVersion -or
        [string]$builtProtoSourceState.algorithm -ne [string]$currentProtoSourceState.algorithm -or
        [string]$builtProtoSourceState.fingerprint -ne [string]$currentProtoSourceState.fingerprint
    }
  } catch {
    $protoSourceChanged = $true
  }
}
$protoBuildRequired = $protoSourceChanged -or $missingProtoArtifacts.Count -gt 0

$proDir = Join-Path $Root "Pro-GetPic"
$browserDir = Join-Path $Root "browser"
$browserPluginDir = Join-Path $browserDir "extensions\pro-getpic"
$pluginSyncMarker = Join-Path $browserDir "extensions\pro-getpic\version.json"

$requiredPluginFiles = @("manifest.json", "tuget-build.json", "EXTENSION_ID", "version.json", "background.js")
$pluginInstalled = $true
foreach ($pluginFile in $requiredPluginFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $browserPluginDir $pluginFile) -PathType Leaf)) {
    $pluginInstalled = $false
    break
  }
}

# 共享协议变化时必须同步重建扩展；否则扩展、Native Host 和客户端
# 可能在同一 protocolVersion 下带着不同的严格 JSON Schema 运行。
$needPluginRefresh = $Rebuild -or $UpdatePlugin -or -not $pluginInstalled -or $protoSourceChanged
$syncedSourceFingerprint = $null
$syncedSourceFingerprintSchemaVersion = $null
$syncedSourceFingerprintAlgorithm = $null
if ($pluginInstalled) {
  try {
    $syncInfo = Get-Content -LiteralPath $pluginSyncMarker -Raw | ConvertFrom-Json
    $syncedSourceFingerprint = [string]$syncInfo.sourceFingerprint
    $syncedSourceFingerprintSchemaVersion = $syncInfo.sourceFingerprintSchemaVersion
    $syncedSourceFingerprintAlgorithm = [string]$syncInfo.sourceFingerprintAlgorithm
  } catch {
    $needPluginRefresh = $true
  }
}

$proSourceChanged = $false
$currentProSourceState = $null
if (-not $needPluginRefresh) {
  try {
    $currentProSourceState = Get-ProGetPicSourceFingerprint $proDir
  } catch {
    Write-Fail $_.Exception.Message
    exit 1
  }

  $proSourceChanged =
    [int]$syncedSourceFingerprintSchemaVersion -ne [int]$currentProSourceState.schemaVersion -or
    $syncedSourceFingerprintAlgorithm -ne [string]$currentProSourceState.algorithm -or
    $syncedSourceFingerprint -ne [string]$currentProSourceState.fingerprint
  $needPluginRefresh = $proSourceChanged
}

# ── 1. tuget-protocol ─────────────────────────────────────────────────────────
# 只停止当前工作区的开发客户端及其专用浏览器，避免旧浏览器继续使用旧插件/管道，
# 也避免 Native Host 占用构建目标。绝不按进程名终止已安装的客户端或用户普通 Chrome。
& (Join-Path $PSScriptRoot 'stop-development-runtime.ps1') -WorkspaceRoot $Root
Write-Step "1/6  tuget-protocol — 共享协议包"

if (-not $Rebuild -and -not $protoBuildRequired) {
  Write-Skip "dist 构建标记与协议源码内容指纹一致，跳过（用 -Rebuild 强制重建）"
} else {
  if (-not $Rebuild -and $missingProtoArtifacts.Count -gt 0) {
    Write-Info "协议构建产物不完整，自动重建：$($missingProtoArtifacts -join ', ')"
  }
  Invoke-NpmInstallIfNeeded $protoDir
  Push-Location $protoDir
  Write-Info "构建协议包..."
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Fail "tuget-protocol 构建失败"; Pop-Location; exit 1 }
  Pop-Location
  $missingProtoArtifactsAfterBuild = @($requiredProtoArtifacts | Where-Object {
    -not (Test-Path -LiteralPath $_ -PathType Leaf)
  })
  if ($missingProtoArtifactsAfterBuild.Count -gt 0) {
    Write-Fail "tuget-protocol 构建成功但关键产物仍缺失：$($missingProtoArtifactsAfterBuild -join ', ')"
    exit 1
  }
  Write-Ok "协议包构建完成"
}

# ── 2. Pro-GetPic (desktop 扩展) ──────────────────────────────────────────────
Write-Step "2/6  Pro-GetPic — desktop 扩展构建"

if ($needPluginRefresh) {
  if ($Rebuild) {
    Write-Info "已要求全量重建，刷新 Pro-GetPic 插件链"
  } elseif ($UpdatePlugin) {
    Write-Info "已要求强制更新 Pro-GetPic 插件"
  } elseif (-not $pluginInstalled) {
    Write-Info "browser 中缺少完整的 Pro-GetPic 插件，执行首次构建"
  } elseif ($protoSourceChanged) {
    Write-Info "共享协议发生变化，刷新 Pro-GetPic 插件链"
  } elseif ($proSourceChanged) {
    Write-Info "Pro-GetPic desktop 构建输入指纹发生变化，自动刷新插件"
  } else {
    Write-Info "Pro-GetPic 同步标记缺失或无效，自动刷新插件"
  }
  Invoke-NpmInstallIfNeeded -ProjectDir $proDir `
    -WorkspaceProtocolDir $protoDir `
    -RequiredNodeSpecifiers @("@tuget/protocol/identity", "@tuget/protocol/version") `
    -ResolutionMode "require"
  Push-Location $proDir
  Write-Info "构建 desktop 扩展..."
  npm run build:desktop
  if ($LASTEXITCODE -ne 0) { Write-Fail "Pro-GetPic desktop 构建失败"; Pop-Location; exit 1 }
  Pop-Location
  Write-Ok "desktop 扩展构建完成"
} else {
  Write-Skip "desktop 构建输入指纹一致（$($currentProSourceState.fileCount) 个文件），复用 browser 中现有插件"
}

# ── 3. browser (Chromium 引擎 + 扩展注入) ─────────────────────────────────────
Write-Step "3/6  browser — 插件同步与 Chromium 引擎"

$preferredBrowserExe = Join-Path $browserDir "target\release\tuget-browser.exe"
$legacyBrowserExe = Join-Path $browserDir "target\release\getpic-browser.exe"
$browserExe = $null
if (Test-Path -LiteralPath $preferredBrowserExe -PathType Leaf) {
  $browserExe = $preferredBrowserExe
} elseif (Test-Path -LiteralPath $legacyBrowserExe -PathType Leaf) {
  $browserExe = $legacyBrowserExe
}
$browserSourceChanged = $browserExe -and (Test-SourceNewerThanArtifact @(
  (Join-Path $browserDir "src"),
  (Join-Path $browserDir "Cargo.toml"),
  (Join-Path $browserDir "Cargo.lock")
) $browserExe)

if ($needPluginRefresh) {
  Push-Location $browserDir
  Write-Info "把最新 Pro-GetPic desktop 插件同步到 browser..."
  npm run update-plugin
  if ($LASTEXITCODE -ne 0) { Write-Fail "desktop 扩展同步失败，拒绝继续使用旧产物"; Pop-Location; exit 1 }
  Pop-Location
  Write-Ok "最新插件已同步到 browser；browser 程序无需因此重新编译"
} else {
  Write-Skip "使用 browser 中现有插件，跳过插件同步"
}

if ($SkipBrowser) {
  if (-not $browserExe) {
    Write-Fail "使用了 -SkipBrowser，但 browser release 程序不存在"
    exit 1
  }
  Write-Skip "已通过 -SkipBrowser 跳过 browser 程序构建"
} elseif ($Rebuild -or -not $browserExe -or $browserSourceChanged) {
  Push-Location $browserDir
  Write-Info "构建 browser 引擎 (cargo build --release)..."
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Fail "browser 构建失败"; Pop-Location; exit 1 }
  Pop-Location
  if (-not (Test-Path -LiteralPath $preferredBrowserExe -PathType Leaf)) {
    Write-Fail "browser 构建命令成功，但未生成 $preferredBrowserExe"
    exit 1
  }
  $browserExe = $preferredBrowserExe
  Write-Ok "browser 引擎构建完成"
} else {
  Write-Skip "browser release 程序与源码时间戳一致，跳过构建（用 -Rebuild 强制重建）"
}

# 即使本轮没有刷新插件，也要验证现有插件目录，防止手工改动或文件损坏被静默复用。
Push-Location $browserDir
Write-Info "校验 browser 中的 Pro-GetPic 插件..."
npm run verify
$browserVerifyExitCode = $LASTEXITCODE
Pop-Location
if ($browserVerifyExitCode -ne 0) {
  Write-Fail "browser 扩展校验失败"
  exit 1
}
Write-Ok "browser 扩展校验通过"

# ── 4. tuget-native-host ──────────────────────────────────────────────────────
Write-Step "4/6  tuget-native-host — Native Messaging 桥"

$hostDir = Join-Path $Root "tuget-native-host"
$hostExe = Join-Path $hostDir "target\debug\tuget-native-host.exe"
$hostSourceChanged = Test-SourceNewerThanArtifact @(
  (Join-Path $hostDir "src"),
  (Join-Path $hostDir "build.rs"),
  (Join-Path $hostDir "Cargo.toml"),
  (Join-Path $hostDir "Cargo.lock"),
  # Native Host 通过 build.rs 把这份共享 Schema 内嵌进 exe。不把它纳入比较，
  # 新扩展的合法事件就会被旧 Host 拒绝，并进入无限重连。
  (Join-Path $protoDir "schema\protocol.schema.json")
) $hostExe

if (-not $Rebuild -and (Test-Path $hostExe) -and -not $hostSourceChanged) {
  Write-Skip "debug exe 与源码时间戳一致，跳过（用 -Rebuild 强制重建）"
} else {
  Push-Location $hostDir
  Write-Info "构建 tuget-native-host (cargo build --bins)..."
  cargo build --bins
  if ($LASTEXITCODE -ne 0) { Write-Fail "tuget-native-host 构建失败"; Pop-Location; exit 1 }
  Pop-Location
  Write-Ok "native host 构建完成"
}

# ── 5. 注册 Native Host ───────────────────────────────────────────────────────
Write-Step "5/6  Native Host 注册检查"

if ($SkipRegister) {
  Write-Skip "已通过 -SkipRegister 跳过"
} else {
  $checkHostScript = Join-Path $hostDir "scripts\check-dev.ps1"
  $registerHostScript = Join-Path $hostDir "scripts\register-dev.ps1"
  $developmentHostName = "com.tuget.desktop.dev"
  $expectedManifestPath = Join-Path $hostDir ".generated\$developmentHostName.json"
  $registrationValid = $false

  try {
    foreach ($nativeBrowser in @('Chrome', 'Chromium')) {
      & $checkHostScript -Browser $nativeBrowser -HostName $developmentHostName -ExpectedHostExe $hostExe -ExpectedManifestPath $expectedManifestPath
    }
    $registrationValid = $true
  } catch {
    Write-Info "Native Host 注册不属于当前工作区或已失效：$($_.Exception.Message)"
  }

  if (-not $registrationValid) {
    try {
      Write-Info "重新注册当前工作区的 Native Host..."
      foreach ($nativeBrowser in @('Chrome', 'Chromium')) {
        & $registerHostScript -Browser $nativeBrowser -HostName $developmentHostName -HostExe $hostExe -ManifestPath $expectedManifestPath -Force
        & $checkHostScript -Browser $nativeBrowser -HostName $developmentHostName -ExpectedHostExe $hostExe -ExpectedManifestPath $expectedManifestPath
      }
    } catch {
      Write-Fail "Native Host 注册或复查失败：$($_.Exception.Message)"
      exit 1
    }
    Write-Ok "Native Host 已重新注册并复查通过"
  } else {
    Write-Ok "Native Host 已注册到当前工作区"
  }
}

# ── 6. 启动 TuGet-Client ──────────────────────────────────────────────────────
Write-Step "6/6  TuGet-Client — 启动 Tauri 开发服务器"

$clientDir = Join-Path $Root "TuGet-Client"

# 检测并终止残留的 tuget-client 进程，避免 Cargo 编译时无法覆盖 exe
$developmentClientExe = Join-Path $clientDir 'src-tauri\target\debug\tuget-client.exe'
$staleProcesses = @(Get-Process -Name "tuget-client" -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -eq $developmentClientExe })
if ($staleProcesses.Count -gt 0) {
  Write-Info "检测到 $($staleProcesses.Count) 个残留 tuget-client 进程，正在终止..."
  foreach ($proc in $staleProcesses) {
    try {
      $proc | Stop-Process -Force -ErrorAction Stop
      Write-Ok "已终止进程 PID $($proc.Id)"
    } catch {
      Write-Fail "无法终止进程 PID $($proc.Id)：$($_.Exception.Message)"
      exit 1
    }
  }
  Start-Sleep -Milliseconds 500
} else {
  Write-Skip "无残留 tuget-client 进程"
}

# 检查端口 1430（TuGet 开发端口，避免与当图客户端 1420 冲突）
Write-Info "检查端口 1430..."
$portListeners = @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
  Where-Object { $_.Port -eq 1430 })
if ($portListeners.Count -gt 0) {
  # 用 netstat -ano 查找占用端口 1430 的进程（比 Get-NetTCPConnection 对 IPv6 更可靠）
  $netstatLines = @(netstat -ano | Where-Object { $_ -match ':1430\s.*LISTENING\s+(\d+)$' })
  if ($netstatLines.Count -gt 0) {
    $stalePortPids = @()
    foreach ($line in $netstatLines) {
      if ($line -match ':1430\s.*LISTENING\s+(\d+)$') {
        $stalePortPids += [int]$Matches[1]
      }
    }
    $stalePortPids = $stalePortPids | Sort-Object -Unique
    foreach ($pidVal in $stalePortPids) {
      $portProc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
      if ($portProc) {
        Write-Info "端口 1430 被进程 $($portProc.ProcessName) (PID $pidVal) 占用，正在终止..."
        Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
      }
    }
    Start-Sleep -Milliseconds 500
    # 再次检查端口是否已释放
    $stillListening = @([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
      Where-Object { $_.Port -eq 1430 })
    if ($stillListening.Count -gt 0) {
      Write-Fail "端口 1430 仍被占用（监听地址: $($stillListening -join ',')）。请手动关闭占用端口的进程后重试。"
      exit 1
    }
    Write-Ok "端口 1430 已释放"
  } else {
    Write-Fail "端口 1430 已被占用但无法确定占用进程。请手动关闭占用端口的进程后重试。"
    exit 1
  }
}

Invoke-NpmInstallIfNeeded -ProjectDir $clientDir `
  -WorkspaceProtocolDir $protoDir `
  -RequiredNodeSpecifiers @("@tuget/protocol/channels") `
  -ResolutionMode "import"
# 开发启动必须使用上方刚构建、同步并校验的引擎。客户端为了保护安装版，
# 默认优先读取 exe 旁的 browser-engine；target/debug 中遗留的打包测试副本
# 会因此遮住最新的工作区产物，导致 dev:rebuild 成功后仍运行旧插件。
$env:TUGET_BROWSER_ENGINE_EXE = $browserExe
$env:TUGET_BROWSER_ENGINE_HOME = $browserDir
Write-Ok "本次开发运行锁定 Browser Engine: $env:TUGET_BROWSER_ENGINE_EXE"
Write-Ok "本次开发运行锁定插件目录: $(Join-Path $browserDir 'extensions\Pro-GetPic')"
Push-Location $clientDir
Write-Host ""
Write-Host "  启动 Tauri 开发服务器..." -ForegroundColor White
Write-Host "  项目目录: $clientDir" -ForegroundColor DarkGray
Write-Host "  开发地址: http://localhost:1430" -ForegroundColor DarkGray
Write-Host ""
npx tauri dev
$clientExitCode = $LASTEXITCODE
Pop-Location
if ($clientExitCode -ne 0) {
  Write-Fail "TuGet-Client 启动失败（exit code: $clientExitCode）"
  exit $clientExitCode
}
