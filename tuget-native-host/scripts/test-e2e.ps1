param(
  [string]$ChromeExe,
  [switch]$KeepRegistration
)

$ErrorActionPreference = "Stop"

$HostName = "com.tuget.desktop"
$DesktopExtensionId = "dojjjgfogfhepmnoejgaofgooohddlcm"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

if ([string]::IsNullOrWhiteSpace($ChromeExe)) {
  $ChromeExe = Join-Path $RepoRoot "..\browser\chromium\chrome.exe"
}
if (-not (Test-Path -LiteralPath $ChromeExe -PathType Leaf)) {
  throw "Chromium executable was not found: $ChromeExe"
}
$ChromeExe = (Resolve-Path -LiteralPath $ChromeExe).Path

if (Test-Path -LiteralPath $RegistryPath) {
  throw "$HostName is already registered for Chrome. Run scripts/check-dev.ps1 and preserve or unregister the existing registration before E2E testing."
}

& cargo build --manifest-path (Join-Path $RepoRoot "Cargo.toml") --bins
if ($LASTEXITCODE -ne 0) {
  throw "cargo build --bins failed with exit code $LASTEXITCODE"
}

$CacheRoot = Join-Path $RepoRoot ".cache"
New-Item -ItemType Directory -Path $CacheRoot -Force | Out-Null
$Stamp = Get-Date -Format "yyyyMMddHHmmssfff"
$PipeName = "\\.\pipe\tuget.desktop.e2e-$Stamp"
$ResultPath = Join-Path $CacheRoot "native-host-e2e-$Stamp.json"
$ServerStdout = Join-Path $CacheRoot "native-host-e2e-server-$Stamp.stdout.log"
$ServerStderr = Join-Path $CacheRoot "native-host-e2e-server-$Stamp.stderr.log"
$ChromeStdout = Join-Path $CacheRoot "native-host-e2e-chrome-$Stamp.stdout.log"
$ChromeStderr = Join-Path $CacheRoot "native-host-e2e-chrome-$Stamp.stderr.log"
$ProfilePath = Join-Path $CacheRoot "native-host-e2e-profile-$Stamp"
$ExtensionPath = (Resolve-Path (Join-Path $RepoRoot "tests\native-extension")).Path
$HostExe = Join-Path $RepoRoot "target\debug\tuget-native-host.exe"
$ServerExe = Join-Path $RepoRoot "target\debug\tuget-pipe-test-server.exe"
$Registered = $false
$ServerProcess = $null
$ChromeProcess = $null

try {
  & (Join-Path $PSScriptRoot "register-dev.ps1") -Browser Chrome -HostExe $HostExe
  $Registered = $true
  & (Join-Path $PSScriptRoot "check-dev.ps1") -Browser Chrome

  $env:TUGET_NATIVE_PIPE = $PipeName
  $env:TUGET_PIPE_CONNECT_TIMEOUT_MS = "20000"
  $ServerProcess = Start-Process -FilePath $ServerExe -ArgumentList @(
    "--pipe", $PipeName,
    "--result", $ResultPath
  ) -RedirectStandardOutput $ServerStdout -RedirectStandardError $ServerStderr -WindowStyle Hidden -PassThru

  New-Item -ItemType Directory -Path $ProfilePath -Force | Out-Null
  $ChromeProcess = Start-Process -FilePath $ChromeExe -ArgumentList @(
    "--user-data-dir=$ProfilePath",
    "--disable-extensions-except=$ExtensionPath",
    "--load-extension=$ExtensionPath",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--window-position=-32000,-32000",
    "chrome-extension://$DesktopExtensionId/status.html"
  ) -RedirectStandardOutput $ChromeStdout -RedirectStandardError $ChromeStderr -WindowStyle Hidden -PassThru

  for ($Attempt = 0; $Attempt -lt 90; $Attempt++) {
    if (Test-Path -LiteralPath $ResultPath) { break }
    if ($ServerProcess.HasExited -and $ServerProcess.ExitCode -ne 0) {
      $Details = if (Test-Path -LiteralPath $ServerStderr) { Get-Content -LiteralPath $ServerStderr -Raw } else { "" }
      throw "Named Pipe test server exited with code $($ServerProcess.ExitCode): $Details"
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not (Test-Path -LiteralPath $ResultPath)) {
    $ServerDetails = if (Test-Path -LiteralPath $ServerStderr) { Get-Content -LiteralPath $ServerStderr -Raw } else { "" }
    $ChromeDetails = if (Test-Path -LiteralPath $ChromeStderr) { Get-Content -LiteralPath $ChromeStderr -Raw } else { "" }
    throw "Native Messaging E2E test timed out.`nServer: $ServerDetails`nChromium: $ChromeDetails"
  }

  $Result = Get-Content -LiteralPath $ResultPath -Raw | ConvertFrom-Json
  if (-not $Result.passed -or [int]$Result.protocolVersion -ne 1 -or $Result.firstType -ne "HELLO" -or $Result.reconnectType -ne "HEARTBEAT" -or $Result.responseType -ne "HELLO_ACK" -or $Result.finalType -ne "ENGINE_READY") {
    throw "Native Messaging E2E result is incomplete: $(Get-Content -LiteralPath $ResultPath -Raw)"
  }

  Write-Host "Native Messaging + Named Pipe E2E passed" -ForegroundColor Green
  Write-Host "  Host: $HostName"
  Write-Host "  ExtensionId: $DesktopExtensionId"
  Write-Host "  Pipe: $PipeName"
  Write-Host "  Flow: HELLO -> disconnect/reconnect -> HEARTBEAT -> HELLO_ACK -> ENGINE_READY"
  Write-Host "  Result: $ResultPath"
} finally {
  $TestChromeProcesses = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -eq "chrome.exe" -and $_.CommandLine -like "*$ProfilePath*"
  }
  foreach ($Process in @($TestChromeProcesses)) {
    Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
  }
  if ($null -ne $ChromeProcess -and -not $ChromeProcess.HasExited) {
    Stop-Process -Id $ChromeProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($null -ne $ServerProcess -and -not $ServerProcess.HasExited) {
    Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($Registered -and -not $KeepRegistration) {
    & (Join-Path $PSScriptRoot "unregister-dev.ps1") -Browser Chrome
  }
  Remove-Item Env:\TUGET_NATIVE_PIPE -ErrorAction SilentlyContinue
  Remove-Item Env:\TUGET_PIPE_CONNECT_TIMEOUT_MS -ErrorAction SilentlyContinue
}
