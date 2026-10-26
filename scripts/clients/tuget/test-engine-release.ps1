# Isolated fixtures only. Does not install/uninstall TuGet or modify registrations.
$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('tuget-release-check-' + [Guid]::NewGuid().ToString('N'))
$prepare = Join-Path $PSScriptRoot 'prepare-engine-release.ps1'
$required = @('tuget-browser.exe', 'tuget-native-host.exe', 'chromium/chrome.exe', 'chromium/chrome_elf.dll',
  'chromium/icudtl.dat', 'chromium/resources.pak', 'chromium/locales/en-US.pak',
  'extensions/pro-getpic/manifest.json', 'extensions/pro-getpic/tuget-build.json')
foreach ($relative in $required) {
  $file = Join-Path $fixture $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $file) -Force | Out-Null
  [IO.File]::WriteAllBytes($file, [Text.Encoding]::UTF8.GetBytes('fixture'))
}
$rejected = $false
try { & $prepare -EngineDirectory $fixture }
catch { if ($_.Exception.Message -notlike '*missing or empty*') { throw }; $rejected = $true }
if (-not $rejected) { throw 'Incomplete engine accepted' }
[IO.File]::WriteAllBytes((Join-Path $fixture 'chromium/chrome.dll'), [Text.Encoding]::UTF8.GetBytes('fixture'))
& $prepare -EngineDirectory $fixture
$inventory = Get-Content -LiteralPath (Join-Path $fixture 'engine-integrity.json') -Raw | ConvertFrom-Json
if ($inventory.files.Count -ne 10) { throw 'Wrong inventory file count' }
foreach ($entry in $inventory.files) {
  if ($entry.sha256 -ne (Get-FileHash -LiteralPath (Join-Path $fixture $entry.path) -Algorithm SHA256).Hash.ToLowerInvariant()) {
    throw "Hash mismatch: $($entry.path)"
  }
}
$rejected = $false
try { & $prepare -EngineDirectory $fixture -RequireSignature }
catch { if ($_.Exception.Message -notlike '*no valid signature*') { throw }; $rejected = $true }
if (-not $rejected) { throw 'Unsigned release accepted' }
. (Join-Path $PSScriptRoot '../../../browser/scripts/signature-policy.ps1')
$expected = 'A' * 40
$signature = [pscustomobject]@{ Status = 'Valid'; SignerCertificate = [pscustomobject]@{ Thumbprint = $expected } }
Assert-TuGetSignature -Signature $signature -ExpectedThumbprint $expected -Label 'fixture'
$signature.SignerCertificate.Thumbprint = 'B' * 40
$rejected = $false
try { Assert-TuGetSignature -Signature $signature -ExpectedThumbprint $expected -Label 'fixture' }
catch { if ($_.Exception.Message -notlike '*Unexpected signing certificate*') { throw }; $rejected = $true }
if (-not $rejected) { throw 'Different trusted publisher accepted' }
$rejected = $false
try { Assert-TuGetSignature -Signature $signature -ExpectedThumbprint '' -Label 'fixture' }
catch { if ($_.Exception.Message -notlike '*Set TUGET_SIGN_EXPECTED_THUMBPRINT*') { throw }; $rejected = $true }
if (-not $rejected) { throw 'Unconfigured publisher gate accepted' }
Write-Host 'PASS: inventory hashes, unsigned signature gate, missing DLL gate, publisher pinning and required identity'
Write-Host "Fixtures retained for inspection: $fixture"
