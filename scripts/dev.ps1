param(
  [ValidateSet('dangtu', 'tuget')]
  [string]$Client,

  [switch]$Rebuild,
  [Alias('RebuildPlugin')]
  [switch]$UpdatePlugin,
  [switch]$SkipBrowser,
  [switch]$SkipRegister,
  [switch]$Check
)

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if ([string]::IsNullOrWhiteSpace($Client)) {
  Write-Host ''
  Write-Host '  请选择要启动的客户端:' -ForegroundColor Cyan
  Write-Host ''
  Write-Host '  [1] 当图客户端 (dangtu)  - Tauri v2 + Vue 3' -ForegroundColor White
  Write-Host '      端口 1420 - 直接启动前端+Rust' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host '  [2] TuGet 客户端 (tuget)  - Tauri v2 + Vue 3' -ForegroundColor White
  Write-Host '      端口 1430 - 完整快速启动，按内容变化自动构建或复用插件' -ForegroundColor DarkGray
  Write-Host ''
  $choice = Read-Host '请输入 1 或 2'

  if ($choice -eq '1') {
    $Client = 'dangtu'
  }
  if ($choice -eq '2') {
    $Client = 'tuget'
  }
  if ([string]::IsNullOrWhiteSpace($Client)) {
    Write-Host '输入无效，已取消。' -ForegroundColor Red
    exit 1
  }
}

if ($Client -eq 'dangtu') {
  Write-Host "
启动当图客户端..." -ForegroundColor Green
  $dangtuScript = Join-Path $Root 'scripts/clients/dangtu/启动开发环境.bat'
  if (-not (Test-Path -LiteralPath $dangtuScript -PathType Leaf)) {
    Write-Host "未找到当图启动脚本: $dangtuScript" -ForegroundColor Red
    exit 1
  }

  if ($Check) {
    & $dangtuScript '--check'
  } else {
    & $dangtuScript
  }
}

if ($Client -eq 'tuget') {
  Write-Host "
启动 TuGet 客户端..." -ForegroundColor Green
  $tugetScript = Join-Path $Root 'scripts/clients/tuget/启动完整开发环境.ps1'
  if (-not (Test-Path -LiteralPath $tugetScript -PathType Leaf)) {
    Write-Host "未找到 TuGet 启动脚本: $tugetScript" -ForegroundColor Red
    exit 1
  }

  $params = @{}
  if ($Rebuild) { $params.Rebuild = $true }
  if ($UpdatePlugin) { $params.UpdatePlugin = $true }
  if ($SkipBrowser) { $params.SkipBrowser = $true }
  if ($SkipRegister) { $params.SkipRegister = $true }
  if ($Check) { $params.Check = $true }
  & $tugetScript @params
  exit $LASTEXITCODE
}
