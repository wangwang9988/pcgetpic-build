param(
  [ValidateSet("Chrome", "Chromium", "Edge")]
  [string]$Browser = "Chrome",
  [ValidateSet("com.tuget.desktop", "com.tuget.desktop.dev")]
  [string]$HostName = "com.tuget.desktop",
  [string]$ExpectedHostExe,
  [string]$ExpectedManifestPath
)

$ErrorActionPreference = "Stop"

$DesktopOrigin = "chrome-extension://dojjjgfogfhepmnoejgaofgooohddlcm/"
$RegistryParents = @{
  Chrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts"
  Chromium = "HKCU:\Software\Chromium\NativeMessagingHosts"
  Edge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts"
}
$RegistryPath = Join-Path $RegistryParents[$Browser] $HostName

if (-not (Test-Path -LiteralPath $RegistryPath)) {
  throw "$HostName is not registered for ${Browser}: $RegistryPath"
}
$ManifestPath = [string](Get-Item -LiteralPath $RegistryPath).GetValue("")
if ([string]::IsNullOrWhiteSpace($ManifestPath) -or -not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
  throw "Registered Native Host manifest does not exist: $ManifestPath"
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
if ($Manifest.name -ne $HostName) {
  throw "Native Host manifest name mismatch. Expected $HostName, got $($Manifest.name)"
}
if ($Manifest.type -ne "stdio") {
  throw "Native Host manifest type must be stdio."
}
if (@($Manifest.allowed_origins).Count -ne 1 -or @($Manifest.allowed_origins)[0] -ne $DesktopOrigin) {
  throw "Native Host allowed_origins must contain only $DesktopOrigin"
}
if (-not (Test-Path -LiteralPath $Manifest.path -PathType Leaf)) {
  throw "Native Host executable does not exist: $($Manifest.path)"
}

function Get-NormalizedFullPath([string]$Path) {
  return [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedManifestPath)) {
  $actualManifestPath = Get-NormalizedFullPath $ManifestPath
  $normalizedExpectedManifestPath = Get-NormalizedFullPath $ExpectedManifestPath
  if (-not [string]::Equals($actualManifestPath, $normalizedExpectedManifestPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Native Host manifest path mismatch. Expected $normalizedExpectedManifestPath, got $actualManifestPath"
  }
}

if (-not [string]::IsNullOrWhiteSpace($ExpectedHostExe)) {
  $actualHostExe = Get-NormalizedFullPath ([string]$Manifest.path)
  $normalizedExpectedHostExe = Get-NormalizedFullPath $ExpectedHostExe
  if (-not [string]::Equals($actualHostExe, $normalizedExpectedHostExe, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Native Host executable path mismatch. Expected $normalizedExpectedHostExe, got $actualHostExe"
  }
}

Write-Host "TuGet Native Host registration is valid for $Browser" -ForegroundColor Green
Write-Host "  Registry: $RegistryPath"
Write-Host "  Manifest: $ManifestPath"
Write-Host "  Host: $($Manifest.path)"
Write-Host "  AllowedOrigin: $DesktopOrigin"
