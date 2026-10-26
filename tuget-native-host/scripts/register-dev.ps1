param(
  [ValidateSet("Chrome", "Chromium", "Edge")]
  [string]$Browser = "Chrome",
  [ValidateSet("com.tuget.desktop", "com.tuget.desktop.dev")]
  [string]$HostName = "com.tuget.desktop",
  [string]$HostExe,
  [string]$ManifestPath,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$DesktopOrigin = "chrome-extension://dojjjgfogfhepmnoejgaofgooohddlcm/"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if ([string]::IsNullOrWhiteSpace($HostExe)) {
  $HostExe = Join-Path $RepoRoot "target\debug\tuget-native-host.exe"
}
if (-not (Test-Path -LiteralPath $HostExe -PathType Leaf)) {
  throw "Native Host executable was not found. Run cargo build --bins first: $HostExe"
}
$HostExe = (Resolve-Path -LiteralPath $HostExe).Path

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Join-Path $RepoRoot ".generated\$HostName.json"
}
$ManifestPath = [System.IO.Path]::GetFullPath($ManifestPath)
$GeneratedRoot = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot ".generated"))
if (-not $ManifestPath.StartsWith($GeneratedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Development manifest must stay inside $GeneratedRoot"
}
$ManifestParent = Split-Path -Parent $ManifestPath
New-Item -ItemType Directory -Path $ManifestParent -Force | Out-Null

$Manifest = [ordered]@{
  name = $HostName
  description = "TuGet desktop Native Messaging bridge"
  path = $HostExe
  type = "stdio"
  allowed_origins = @($DesktopOrigin)
}
$Manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

$RegistryParents = @{
  Chrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts"
  Chromium = "HKCU:\Software\Chromium\NativeMessagingHosts"
  Edge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts"
}
$RegistryPath = Join-Path $RegistryParents[$Browser] $HostName
if (Test-Path -LiteralPath $RegistryPath) {
  $ExistingValue = (Get-Item -LiteralPath $RegistryPath).GetValue("")
  if (-not $Force -and -not [string]::Equals([string]$ExistingValue, $ManifestPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "A different $HostName registration already exists for $Browser at $ExistingValue. Use -Force only after reviewing it."
  }
}

New-Item -Path $RegistryPath -Force | Out-Null
Set-Item -LiteralPath $RegistryPath -Value $ManifestPath

Write-Host "TuGet Native Host registered for $Browser" -ForegroundColor Green
Write-Host "  Registry: $RegistryPath"
Write-Host "  Manifest: $ManifestPath"
Write-Host "  Host: $HostExe"
Write-Host "  AllowedOrigin: $DesktopOrigin"
