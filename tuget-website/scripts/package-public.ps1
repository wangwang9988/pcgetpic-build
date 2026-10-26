$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot '.output'
$publicDir = Join-Path $outputDir 'public'
$archivePath = Join-Path $outputDir 'public.zip'
$indexPath = Join-Path $publicDir 'index.html'

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
  throw "Static output is incomplete: $indexPath was not found. Run nuxt generate first."
}

if (Test-Path -LiteralPath $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $publicDir,
  $archivePath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$archive = Get-Item -LiteralPath $archivePath
$sizeMiB = [Math]::Round($archive.Length / 1MB, 2)
Write-Host "Created deployment archive: $archivePath ($sizeMiB MiB)" -ForegroundColor Green
