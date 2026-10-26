[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$EngineDirectory,
  [switch]$Sign,
  [switch]$RequireSignature
)
$ErrorActionPreference = 'Stop'
$engineRoot = (Resolve-Path -LiteralPath $EngineDirectory).Path
$required = @('tuget-browser.exe', 'tuget-native-host.exe', 'chromium/chrome.exe', 'chromium/chrome.dll',
  'chromium/chrome_elf.dll', 'chromium/icudtl.dat', 'chromium/resources.pak', 'chromium/locales/en-US.pak',
  'extensions/pro-getpic/manifest.json', 'extensions/pro-getpic/tuget-build.json')
foreach ($relative in $required) {
  $path = Join-Path $engineRoot $relative
  if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -eq 0) {
    throw "Required engine component is missing or empty: $relative"
  }
}
$signScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../browser/scripts/sign.ps1'))
. (Join-Path (Split-Path -Parent $signScript) 'signature-policy.ps1')
$expectedSigner = Get-TuGetSignerThumbprint
$signatures = @()
foreach ($relative in @('tuget-browser.exe', 'tuget-native-host.exe', 'chromium/chrome.exe', 'chromium/chrome.dll')) {
  $path = Join-Path $engineRoot $relative
  $owned = $relative -in @('tuget-browser.exe', 'tuget-native-host.exe')
  if ($Sign -and $owned) {
    & pwsh -NoProfile -File $signScript -FilePath $path
    if ($LASTEXITCODE -ne 0) { throw "Signing failed: $relative" }
  }
  $signature = Get-AuthenticodeSignature -LiteralPath $path
  $trustedPublisher = $owned -and $signature.Status -eq 'Valid' -and $expectedSigner -and $signature.SignerCertificate.Thumbprint -eq $expectedSigner
  $signatures += @{ path = $relative; status = [string]$signature.Status; signer = $signature.SignerCertificate.Subject;
    thumbprint = $signature.SignerCertificate.Thumbprint; tugetPublisherVerified = [bool]$trustedPublisher }
  if ($owned -and ($Sign -or $RequireSignature)) {
    Assert-TuGetSignature -Signature $signature -ExpectedThumbprint $expectedSigner -Label $relative
  }
  if ($signature.Status -ne 'Valid') {
    Write-Warning "Signature $($signature.Status): $relative. Windows application-control policies may block this component."
  }
}
# Hash the final, signed bytes. This inventory detects missing/corrupted files;
# it does not substitute for Authenticode trust or promise acceptance by antivirus.
$files = @(Get-ChildItem -LiteralPath $engineRoot -Recurse -File |
  Where-Object { $_.Name -notin @('engine-integrity.json', 'release-manifest.json') } |
  Sort-Object FullName)
if ($files.Count -eq 0 -or $files.Count -gt 5000) { throw 'Unexpected engine file count' }
$entries = foreach ($file in $files) {
  if ($file.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Engine must not contain links: $($file.FullName)" }
  @{ path = [IO.Path]::GetRelativePath($engineRoot, $file.FullName).Replace('\', '/');
     size = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
@{ schemaVersion = 1; files = @($entries); signatures = $signatures } | ConvertTo-Json -Depth 6 |
  Set-Content -LiteralPath (Join-Path $engineRoot 'engine-integrity.json') -Encoding utf8NoBOM
Write-Host "Engine inventory verified and written: $($files.Count) files"
