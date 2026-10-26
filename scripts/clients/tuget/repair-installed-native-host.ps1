<#
.SYNOPSIS
  修复旧 MSIX 的 Native Host 物理路径，不修改安装包或开发版注册项。
.DESCRIPTION
  旧 MSIX 注册了逻辑 Roaming 路径，且直接执行 WindowsApps 内的 Host。
  将安装包原始 Host 按 SHA-256 复制到普通进程可访问的位置，在旧版期待的
  逻辑路径生成 manifest。旧 MSIX 后续写入其虚拟 Roaming 目录不会覆盖此文件。
  新版 MSIX 已内置物理路径修复，不需要运行本脚本。
#>
param([string]$PackageFamilyName)
$ErrorActionPreference = 'Stop'
$packages = @(Get-AppxPackage '*TuGet*' | Where-Object {
  -not $_.IsFramework -and (-not $PackageFamilyName -or $_.PackageFamilyName -eq $PackageFamilyName)
})
if ($packages.Count -ne 1) { throw '需要唯一 TuGet MSIX 安装包；多版本环境请指定 -PackageFamilyName。' }
$package = $packages[0]
$source = Join-Path $package.InstallLocation 'VFS\Local AppData\TuGet\browser-engine\tuget-native-host.exe'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "找不到安装包 Native Host：$source" }
$runtimeDir = Join-Path $env:APPDATA 'com.tuget.client\native-messaging'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
$destination = Join-Path $runtimeDir "tuget-native-host-$hash.exe"
if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
  Copy-Item -LiteralPath $source -Destination $destination
}
if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash) {
  throw "运行时 Host 与安装包内容不一致：$destination"
}
$manifestPath = Join-Path $runtimeDir 'com.tuget.desktop.json'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
  Copy-Item -LiteralPath $manifestPath -Destination "$manifestPath.$stamp.bak"
}
$registryKeys = @('Google\Chrome', 'Chromium') | ForEach-Object {
  "HKCU:\Software\$_\NativeMessagingHosts\com.tuget.desktop"
}
$previous = @($registryKeys | ForEach-Object {
  [pscustomobject]@{ key = $_; value = $(if (Test-Path -LiteralPath $_) { (Get-Item -LiteralPath $_).GetValue('') } else { $null }) }
})
$previous | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir "registration-$stamp.backup.json") -Encoding utf8
[ordered]@{
  name = 'com.tuget.desktop'
  description = 'TuGet installed Native Messaging bridge'
  path = $destination
  type = 'stdio'
  allowed_origins = @('chrome-extension://dojjjgfogfhepmnoejgaofgooohddlcm/')
} | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
foreach ($key in $registryKeys) {
  New-Item -Path $key -Force | Out-Null
  Set-Item -LiteralPath $key -Value $manifestPath
}
Write-Host "已修复 MSIX $($package.Version) 的生产通信注册：$manifestPath"
Write-Host "Native Host SHA-256：$hash"
