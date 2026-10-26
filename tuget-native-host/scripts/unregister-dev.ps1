param(
  [ValidateSet("Chrome", "Chromium", "Edge")]
  [string]$Browser = "Chrome",
  [ValidateSet("com.tuget.desktop", "com.tuget.desktop.dev")]
  [string]$HostName = "com.tuget.desktop",
  [switch]$Force
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
  Write-Host "TuGet Native Host is already unregistered for $Browser"
  exit 0
}

$ManifestPath = [string](Get-Item -LiteralPath $RegistryPath).GetValue("")
if (-not $Force) {
  if ([string]::IsNullOrWhiteSpace($ManifestPath) -or -not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    throw "The registered manifest cannot be verified: $ManifestPath. Use -Force only after reviewing the registry key."
  }
  $Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
  if ($Manifest.name -ne $HostName -or @($Manifest.allowed_origins).Count -ne 1 -or @($Manifest.allowed_origins)[0] -ne $DesktopOrigin) {
    throw "The registration does not match TuGet desktop identity. Refusing to remove it without -Force."
  }
}

Remove-Item -LiteralPath $RegistryPath -Recurse -Force
Write-Host "TuGet Native Host unregistered for $Browser" -ForegroundColor Green
Write-Host "  Removed: $RegistryPath"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$GeneratedRoot = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot ".generated"))
if (-not [string]::IsNullOrWhiteSpace($ManifestPath)) {
  $FullManifestPath = [System.IO.Path]::GetFullPath($ManifestPath)
  if ($FullManifestPath.StartsWith($GeneratedRoot, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $FullManifestPath)) {
    Remove-Item -LiteralPath $FullManifestPath -Force
    Write-Host "  Removed generated manifest: $FullManifestPath"
  }
}
