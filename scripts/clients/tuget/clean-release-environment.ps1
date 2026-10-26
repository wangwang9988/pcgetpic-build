[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "Medium")]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
}

function Assert-ChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Parent
  )

  $fullPath = Get-FullPath $Path
  $fullParent = Get-FullPath $Parent
  if (
    [string]::Equals($fullPath, $fullParent, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not $fullPath.StartsWith("$fullParent\", [System.StringComparison]::OrdinalIgnoreCase)
  ) {
    throw "Refusing to remove a path outside the approved parent $fullParent`: $fullPath"
  }

  return $fullPath
}

function Test-FileLocked {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $false
  }

  try {
    $stream = [System.IO.File]::Open(
      $Path,
      [System.IO.FileMode]::Open,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
    $stream.Dispose()
    return $false
  } catch [System.IO.IOException] {
    return $true
  }
}

function Remove-SafeItem {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Parent,
    [Parameter(Mandatory = $true)][string]$Label,
    [switch]$AllowLockedFile
  )

  $fullPath = Assert-ChildPath -Path $Path -Parent $Parent
  if (-not (Test-Path -LiteralPath $fullPath)) {
    return
  }

  if ($PSCmdlet.ShouldProcess($fullPath, "Remove $Label")) {
    $attempts = if ($AllowLockedFile) { 10 } else { 1 }
    for ($attempt = 1; $attempt -le $attempts; $attempt++) {
      try {
        Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction Stop
        break
      } catch {
        if ($attempt -eq $attempts) {
          if ($AllowLockedFile -and (Test-FileLocked -Path $fullPath)) {
            Write-Warning "Skipping locked convenience installer $fullPath. The versioned installer remains the authoritative build output."
            return
          }
          throw
        }
        Start-Sleep -Milliseconds 500
      }
    }
    if (Test-Path -LiteralPath $fullPath) {
      throw "Cleanup did not completely remove $fullPath"
    }
    Write-Host "[removed] $fullPath" -ForegroundColor DarkGray
  }
}

function Remove-ExactRegistryKey {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  if ($PSCmdlet.ShouldProcess($Path, "Remove TuGet registry key")) {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $Path) {
      throw "Cleanup did not completely remove registry key $Path"
    }
    Write-Host "[removed registry] $Path" -ForegroundColor DarkGray
  }
}

function Remove-ExactRegistryValue {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }
  $item = Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction SilentlyContinue
  if ($null -eq $item) {
    return
  }

  $target = "$Path [$Name]"
  if ($PSCmdlet.ShouldProcess($target, "Remove TuGet registry value")) {
    Remove-ItemProperty -LiteralPath $Path -Name $Name -Force -ErrorAction Stop
    Write-Host "[removed registry value] $target" -ForegroundColor DarkGray
  }
}

$workspaceRoot = Get-FullPath (Join-Path $PSScriptRoot "..\..\..")
$clientDir = Join-Path $workspaceRoot "TuGet-Client"
$localAppData = Get-FullPath $env:LOCALAPPDATA
$roamingAppData = Get-FullPath $env:APPDATA
$userProfile = Get-FullPath $env:USERPROFILE
$desktopDir = Join-Path $userProfile "Desktop"
$installRoot = Join-Path $localAppData "TuGet"
$browserRoot = Join-Path $localAppData "TuGetBrowser"
$browserProfile = Join-Path $browserRoot "User Data"
$browserBuildRoot = Join-Path $workspaceRoot "browser\target"
$stableInstallerDir = Join-Path $clientDir "src-tauri\target\release\bundle\nsis"
$clientNodeModulesRoot = Get-FullPath (Join-Path $clientDir "node_modules")

Write-Host "TuGet release environment cleanup" -ForegroundColor Green
Write-Host "This cleanup is intentionally destructive to TuGet install/runtime state for MSIX capture."
Write-Host "Protected build material: $installRoot\build-secrets"

# Stop only TuGet-owned processes. A normal Chrome session is never selected;
# chrome.exe is stopped only when its command line uses the TuGetBrowser profile.
$processSnapshot = @(Get-CimInstance Win32_Process -ErrorAction Stop)
$clientBuildProcessIds = [System.Collections.Generic.HashSet[int]]::new()

# npm ci replaces node_modules atomically enough for normal use, but Windows will
# reject the operation while Vite's esbuild service still has esbuild.exe open.
# Select services launched from this client's node_modules and their direct Node
# parents. This deliberately leaves Node/esbuild processes from other projects alone.
foreach ($process in $processSnapshot) {
  $commandLine = [string]$process.CommandLine
  $executablePath = [string]$process.ExecutablePath
  $usesClientNodeModules = (
    (-not [string]::IsNullOrWhiteSpace($executablePath) -and
      $executablePath.StartsWith("$clientNodeModulesRoot\", [System.StringComparison]::OrdinalIgnoreCase)) -or
    (-not [string]::IsNullOrWhiteSpace($commandLine) -and
      $commandLine.IndexOf("$clientNodeModulesRoot\", [System.StringComparison]::OrdinalIgnoreCase) -ge 0)
  )
  if (-not $usesClientNodeModules) {
    continue
  }

  $null = $clientBuildProcessIds.Add([int]$process.ProcessId)
  $parent = $processSnapshot | Where-Object {
    $_.ProcessId -eq $process.ParentProcessId -and
    [string]::Equals([string]$_.Name, "node.exe", [System.StringComparison]::OrdinalIgnoreCase)
  } | Select-Object -First 1
  if ($null -ne $parent) {
    $null = $clientBuildProcessIds.Add([int]$parent.ProcessId)
  }
}

$processes = @($processSnapshot | Where-Object {
  $name = [string]$_.Name
  $commandLine = [string]$_.CommandLine
  $executablePath = [string]$_.ExecutablePath

  if ($clientBuildProcessIds.Contains([int]$_.ProcessId)) {
    return $true
  }

  # A previously opened setup executable locks its own file and prevents the
  # next release build from replacing the stable installer. Only select setup
  # processes launched from this workspace's exact NSIS output directory.
  if (
    -not [string]::IsNullOrWhiteSpace($executablePath) -and
    $executablePath.StartsWith("$stableInstallerDir\", [System.StringComparison]::OrdinalIgnoreCase)
  ) {
    return $true
  }
  if ($name -in @("tuget-client.exe", "tuget-browser.exe", "tuget-native-host.exe")) {
    return $true
  }
  if ([string]::Equals($name, "chrome.exe", [System.StringComparison]::OrdinalIgnoreCase)) {
    return $commandLine.IndexOf($browserRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
  }
  if ([string]::Equals($name, "getpic-browser.exe", [System.StringComparison]::OrdinalIgnoreCase)) {
    return (
      $commandLine.IndexOf($browserProfile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -or
      $executablePath.StartsWith("$browserBuildRoot\", [System.StringComparison]::OrdinalIgnoreCase)
    )
  }
  return $false
})

foreach ($process in $processes) {
  $target = "$($process.Name) (PID $($process.ProcessId))"
  if ($PSCmdlet.ShouldProcess($target, "Stop TuGet process")) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-Host "[stopped] $target" -ForegroundColor DarkGray
    } catch {
      # A parent process can exit after its child is stopped (and vice versa).
      # Only suppress the race when the selected process is already gone.
      if (Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue) {
        throw
      }
    }
  }
}

if (-not $WhatIfPreference -and $clientBuildProcessIds.Count -gt 0) {
  $remainingIds = @($clientBuildProcessIds | Where-Object {
    Get-Process -Id $_ -ErrorAction SilentlyContinue
  })
  if ($remainingIds.Count -gt 0) {
    Wait-Process -Id $remainingIds -Timeout 10 -ErrorAction SilentlyContinue
  }
}

# Tauri currentUser NSIS installs into %LOCALAPPDATA%\TuGet. The same parent
# deliberately stores the desktop extension signing key, so remove every child
# except build-secrets instead of recursively deleting the parent directory.
if (Test-Path -LiteralPath $installRoot -PathType Container) {
  Get-ChildItem -LiteralPath $installRoot -Force | Where-Object {
    -not [string]::Equals($_.Name, "build-secrets", [System.StringComparison]::OrdinalIgnoreCase)
  } | ForEach-Object {
    Remove-SafeItem -Path $_.FullName -Parent $installRoot -Label "TuGet installed file or runtime data"
  }
}

$fileSystemTargets = @(
  @{ Path = $browserRoot; Parent = $localAppData; Label = "TuGet browser profile" },
  @{ Path = (Join-Path $localAppData "Programs\TuGet"); Parent = $localAppData; Label = "legacy TuGet install directory" },
  @{ Path = (Join-Path $localAppData "Programs\图个吉利 · TuGet"); Parent = $localAppData; Label = "TuGet install directory" },
  @{ Path = (Join-Path $localAppData "图个吉利 · TuGet"); Parent = $localAppData; Label = "TuGet install directory" },
  @{ Path = (Join-Path $localAppData "com.tuget.client"); Parent = $localAppData; Label = "Tauri local app data" },
  @{ Path = (Join-Path $roamingAppData "TuGet"); Parent = $roamingAppData; Label = "TuGet roaming app data" },
  @{ Path = (Join-Path $roamingAppData "图个吉利 · TuGet"); Parent = $roamingAppData; Label = "TuGet roaming app data" },
  @{ Path = (Join-Path $roamingAppData "com.tuget.client"); Parent = $roamingAppData; Label = "Tauri roaming app data" },
  @{ Path = (Join-Path $roamingAppData "Microsoft\Windows\Start Menu\Programs\TuGet"); Parent = $roamingAppData; Label = "TuGet Start Menu folder" },
  @{ Path = (Join-Path $roamingAppData "Microsoft\Windows\Start Menu\Programs\图个吉利 · TuGet"); Parent = $roamingAppData; Label = "TuGet Start Menu folder" },
  @{ Path = (Join-Path $roamingAppData "Microsoft\Windows\Start Menu\Programs\TuGet.lnk"); Parent = $roamingAppData; Label = "TuGet Start Menu shortcut" },
  @{ Path = (Join-Path $roamingAppData "Microsoft\Windows\Start Menu\Programs\图个吉利 · TuGet.lnk"); Parent = $roamingAppData; Label = "TuGet Start Menu shortcut" },
  @{ Path = (Join-Path $desktopDir "TuGet.lnk"); Parent = $desktopDir; Label = "TuGet desktop shortcut" },
  @{ Path = (Join-Path $desktopDir "图个吉利 · TuGet.lnk"); Parent = $desktopDir; Label = "TuGet desktop shortcut" }
)

if ($env:ProgramFiles) {
  $programFiles = Get-FullPath $env:ProgramFiles
  $fileSystemTargets += @{ Path = (Join-Path $programFiles "TuGet"); Parent = $programFiles; Label = "legacy per-machine TuGet install directory" }
  $fileSystemTargets += @{ Path = (Join-Path $programFiles "图个吉利 · TuGet"); Parent = $programFiles; Label = "per-machine TuGet install directory" }
}
if (${env:ProgramFiles(x86)}) {
  $programFilesX86 = Get-FullPath ${env:ProgramFiles(x86)}
  $fileSystemTargets += @{ Path = (Join-Path $programFilesX86 "TuGet"); Parent = $programFilesX86; Label = "legacy 32-bit TuGet install directory" }
  $fileSystemTargets += @{ Path = (Join-Path $programFilesX86 "图个吉利 · TuGet"); Parent = $programFilesX86; Label = "32-bit TuGet install directory" }
}

foreach ($target in $fileSystemTargets) {
  Remove-SafeItem -Path $target.Path -Parent $target.Parent -Label $target.Label
}

# Remove old EXE outputs early. This makes a file lock from MPT, Explorer preview,
# or a still-open installer fail immediately instead of after the long rebuild.
if (Test-Path -LiteralPath $stableInstallerDir -PathType Container) {
  Get-ChildItem -LiteralPath $stableInstallerDir -File -Filter "*.exe" | ForEach-Object {
    $isStableInstaller = [string]::Equals($_.Name, "TuGet-Setup.exe", [System.StringComparison]::OrdinalIgnoreCase)
    Remove-SafeItem -Path $_.FullName -Parent $stableInstallerDir -Label "old TuGet setup executable" -AllowLockedFile:$isStableInstaller
  }
}

$registryKeys = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\TuGet",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\TuGet",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\TuGet",
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\图个吉利 · TuGet",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\图个吉利 · TuGet",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\图个吉利 · TuGet",
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.tuget.desktop",
  "HKCU:\Software\Chromium\NativeMessagingHosts\com.tuget.desktop",
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.tuget.desktop.exe",
  "HKCU:\Software\Chromium\NativeMessagingHosts\com.tuget.desktop.exe",
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.tuget.desktop.msix",
  "HKCU:\Software\Chromium\NativeMessagingHosts\com.tuget.desktop.msix",
  "HKCU:\Software\TuGet",
  "HKLM:\Software\TuGet",
  "HKLM:\Software\WOW6432Node\TuGet",
  "HKCU:\Software\图个吉利 · TuGet",
  "HKLM:\Software\图个吉利 · TuGet",
  "HKLM:\Software\WOW6432Node\图个吉利 · TuGet"
)
foreach ($registryKey in $registryKeys) {
  Remove-ExactRegistryKey -Path $registryKey
}
Remove-ExactRegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "TuGet"
Remove-ExactRegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "图个吉利 · TuGet"

if ($WhatIfPreference) {
  Write-Host "TuGet cleanup preview completed; no state was changed." -ForegroundColor Yellow
} else {
  Write-Host "TuGet release environment is clean." -ForegroundColor Green
}
