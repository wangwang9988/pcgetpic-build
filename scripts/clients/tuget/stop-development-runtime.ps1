param([Parameter(Mandatory = $true)][string]$WorkspaceRoot)

$ErrorActionPreference = 'Stop'
$developmentRoot = (Resolve-Path -LiteralPath $WorkspaceRoot).Path
$clientExe = Join-Path $developmentRoot 'TuGet-Client\src-tauri\target\debug\tuget-client.exe'
$browserRoots = @(
  (Join-Path $developmentRoot 'browser'),
  (Join-Path $developmentRoot 'TuGet-Client\src-tauri\target\debug\browser-engine')
)
# Old installed versions can run workspace Chromium with the legacy production
# profile. Executable ownership alone cannot identify that browser as development.
$profilePatterns = @('TuGetBrowser-Dev\User Data') | ForEach-Object {
  '(?:^|\s)' + [regex]::Escape('--user-data-dir=' + (Join-Path $env:LOCALAPPDATA $_)) + '(?=\s+--|$)'
}
$processes = @(Get-CimInstance Win32_Process)
$browserProcesses = @($processes | Where-Object {
  $candidate = $_
  $candidate.Name -eq 'chrome.exe' -and $candidate.ExecutablePath -and
  @($profilePatterns | Where-Object {
    [regex]::IsMatch(([string]$candidate.CommandLine).Replace('"', ''), $_, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  }).Count -gt 0 -and
  @($browserRoots | Where-Object {
    ([string]$candidate.ExecutablePath).StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase)
  }).Count -gt 0
})

# 先快照浏览器后代，Native Host 可能位于旧安装目录，但只处理本次开发浏览器的后代。
$descendants = [Collections.Generic.HashSet[uint32]]::new()
foreach ($browserProcess in $browserProcesses) { [void]$descendants.Add($browserProcess.ProcessId) }
do {
  $changed = $false
  foreach ($candidate in $processes) {
    if ($descendants.Contains($candidate.ParentProcessId) -and $descendants.Add($candidate.ProcessId)) {
      $changed = $true
    }
  }
} while ($changed)
$targets = @($processes | Where-Object {
  $_.ExecutablePath -eq $clientExe -or
  ($_.Name -eq 'chrome.exe' -and $descendants.Contains($_.ProcessId)) -or
  ($_.Name -like 'tuget-native-host*.exe' -and $descendants.Contains($_.ProcessId))
})
foreach ($target in $targets) {
  $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($target.ProcessId)"
  if ($current -and $current.CreationDate -eq $target.CreationDate -and $current.ExecutablePath -eq $target.ExecutablePath) {
    Stop-Process -Id $target.ProcessId -Force -ErrorAction Stop
    Write-Host "  [OK] 停止旧开发进程 $($target.Name) (PID $($target.ProcessId))；保留采集数据和浏览器 Profile"
  }
}

# 即使 Host 在父进程退出后残留，也不能带着旧 EXE 进入重建阶段。
foreach ($target in $targets) {
  $remaining = Get-CimInstance Win32_Process -Filter "ProcessId = $($target.ProcessId)"
  if ($remaining -and $remaining.CreationDate -eq $target.CreationDate) {
    throw "旧开发进程仍未退出，拒绝混用新旧组件：PID $($target.ProcessId)"
  }
}
