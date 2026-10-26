<#
.SYNOPSIS
    把 .agents/skills（单一真源）镜像同步到各 AI 工具的 skills 目录。

.DESCRIPTION
    本仓库的skill 同时被多套AI 工具读取，各自目录下都是**实体副本**：
        .agents/skills    通用/聚合入口（唯一真源，含全部 8 个 skill 与脚本）
        .codebuddy/skills CodeBuddy
        .trae/skills      Trae
        .catpaw/skills    CatPaw
        .opencode/skills  OpenCode
        .qoder/skills     Qoder

    任何 skill 改动后都应执行本脚本，否则各工具读到的版本会漂移
    （历史上 docs-writer / version-updater / git-sync-all 均已发生过漂移；
    .opencode 与 .qoder 曾长期不在 Targets 中，其 git-sync-all 副本连推送守门都没有）。

.PARAMETER Source
    真源目录，默认 .agents/skills（仓库根相对路径）。

.PARAMETER Targets
    镜像目标目录列表。

.PARAMETER SelfContained
    默认关闭：镜像出的副本内部命令仍指向 .agents/skills（运行时只有一份脚本，
    杜绝「同一脚本多副本漂移」）。开启后会把文本中的 .agents/skills/ 路径改写为
    目标目录自身路径，使每份副本自包含。

.PARAMETER Prune
    删除目标目录中源已不存在的文件。默认不删除（仅报告），避免误删历史遗留脚本
    （如 .catpaw/skills/git-sync-all/scripts/_*.ps1）。

.PARAMETER Check
    只校验不写入；发现漂移（缺失 / 内容不一致 / 镜像中多余文件）时以退出码 1 结束，
    可用于提交前守门。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1
    以真源覆盖三套副本，并补齐缺失文件。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1 -Check
    仅体检，输出漂移清单（不写文件）。
#>
[CmdletBinding()]
param(
    [string] $Source = '.agents/skills',
    [string[]] $Targets = @('.codebuddy/skills', '.trae/skills', '.catpaw/skills', '.opencode/skills', '.qoder/skills'),
    [switch] $SelfContained,
    [switch] $Prune,
    [switch] $Check
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# 需要做路径改写的文本扩展名；二进制文件按字节原样镜像
$TextExtensions = @('.md', '.ps1', '.py', '.json', '.mjs', '.js', '.ts', '.sh', '.yml', '.yaml', '.txt', '.toml', '.cfg')
$ExcludeDirs = @('__pycache__', 'node_modules')

function Get-RelativeFileList {
    param([string] $Root)
    Get-ChildItem -Path $Root -Recurse -File | Where-Object {
        $parts = $_.FullName.Substring((Resolve-Path $Root).Path.Length).TrimStart('\') -split '\\'
        -not ($parts | Where-Object { $_ -in $ExcludeDirs }) -and $_.Extension -ne '.pyc'
    }
}

function Get-MirrorContent {
    param([string] $Path, [string] $TargetRoot)
    $raw = [IO.File]::ReadAllText($Path)
    if ($SelfContained) {
        $raw = $raw.Replace('.agents/skills/', ($TargetRoot -replace '\\', '/') + '/')
    }
    return $raw
}

function Test-HasUtf8Bom {
    param([string] $Path)
    # .ps1 带 BOM 才能让 Windows PowerShell 5.1 正确读取中文字面量，
    # 因此镜像必须逐字节沿用真源的 BOM 状态，否则副本会变成另一份字节内容。
    $bytes = [IO.File]::ReadAllBytes($Path)
    return ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
}

function Write-MirrorFile {
    param([string] $Path, [string] $Content, [bool] $Bom)
    [IO.File]::WriteAllText($Path, $Content, (New-Object Text.UTF8Encoding($Bom)))
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceRoot = Join-Path $root ($Source -replace '/', '\')
if (-not (Test-Path $sourceRoot)) {
    Write-Error "真源目录不存在：$Source"
}

Write-Host "真源：$Source" -ForegroundColor Cyan
Write-Host ("目标：" + ($Targets -join ', ')) -ForegroundColor Cyan
if ($SelfContained) { Write-Host '模式：自包含（改写 .agents/skills 路径为目标目录路径）' -ForegroundColor DarkGray }
else { Write-Host '模式：单一真源（副本内命令仍指向 .agents/skills）' -ForegroundColor DarkGray }
if ($Check) { Write-Host '模式：仅校验（-Check，不写文件）' -ForegroundColor Yellow }
Write-Host ''

$sourceFiles = Get-RelativeFileList -Root $sourceRoot
$totalCreated = 0
$totalUpdated = 0
$totalSame = 0
$totalExtra = 0
$drift = 0

foreach ($target in $Targets) {
    $targetRoot = Join-Path $root ($target -replace '/', '\')
    Write-Host "── $target " -ForegroundColor Cyan

    if (-not (Test-Path $targetRoot)) {
        New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
        Write-Host '   目标目录不存在，已创建' -ForegroundColor Yellow
    }

    $expected = @{}
    foreach ($file in $sourceFiles) {
        $rel = $file.FullName.Substring($sourceRoot.Length).TrimStart('\')
        $expected[$rel.ToLower()] = $rel
        $dest = Join-Path $targetRoot $rel

        $isText = $file.Extension.ToLower() -in $TextExtensions
        $newContent = if ($isText) { Get-MirrorContent -Path $file.FullName -TargetRoot $target } else { $null }
        $sourceBom = if ($isText) { Test-HasUtf8Bom -Path $file.FullName } else { $false }

        if (-not (Test-Path $dest)) {
            $drift++
            $totalCreated++
            Write-Host "   [缺失] $rel" -ForegroundColor Yellow
            if (-not $Check) {
                New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
                if ($isText) { Write-MirrorFile -Path $dest -Content $newContent -Bom $sourceBom }
                else { Copy-Item $file.FullName $dest -Force }
            }
            continue
        }

        if ($isText) {
            $old = [IO.File]::ReadAllText($dest)
            $oldBom = Test-HasUtf8Bom -Path $dest
            if ($old -ceq $newContent -and $oldBom -eq $sourceBom) { $totalSame++; continue }
        } else {
            $oldHash = (Get-FileHash $dest -Algorithm SHA256).Hash
            $newHash = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
            if ($oldHash -eq $newHash) { $totalSame++; continue }
        }

        $drift++
        $totalUpdated++
        Write-Host "   [漂移] $rel" -ForegroundColor Yellow
        if (-not $Check) {
            if ($isText) { Write-MirrorFile -Path $dest -Content $newContent -Bom $sourceBom }
            else { Copy-Item $file.FullName $dest -Force }
        }
    }

    # 报告（并按需删除）目标中源已不存在的文件
    $extras = Get-ChildItem -Path $targetRoot -Recurse -File | Where-Object {
        $parts = $_.FullName.Substring($targetRoot.Length).TrimStart('\') -split '\\'
        -not ($parts | Where-Object { $_ -in $ExcludeDirs }) -and $_.Extension -ne '.pyc'
    }
    foreach ($extra in $extras) {
        $rel = $extra.FullName.Substring($targetRoot.Length).TrimStart('\')
        if ($expected.ContainsKey($rel.ToLower())) { continue }
        $totalExtra++
        if ($Prune -and -not $Check) {
            Remove-Item $extra.FullName -Force
            Write-Host "   [删除] $rel" -ForegroundColor Red
        } else {
            Write-Host "   [多余] $rel（真源已无此文件，加 -Prune 可删除）" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ''
Write-Host "汇总：缺失 $totalCreated/ 漂移 $totalUpdated/ 一致 $totalSame/ 多余 $totalExtra/（总漂移 $($drift + $totalExtra)）" -ForegroundColor Cyan

# -Check 把「多余」也算作漂移：镜像里多出来的文件同样是没同步干净，
# push-all.ps1 的推送前守门依赖这个退出码，必须能拦住这类不一致。
if ($Check -and ($drift -gt 0 -or $totalExtra -gt 0)) {
    Write-Host '存在 skill 漂移，请执行：powershell -ExecutionPolicy Bypass -File scripts/sync-skills.ps1' -ForegroundColor Yellow
    if ($totalExtra -gt 0) {
        Write-Host '（其中包含真源已删除的遗留文件；确认无用可加 -Prune 一并清理）' -ForegroundColor Yellow
    }
    exit 1
}
if (-not $Check) {
    Write-Host '同步完成。' -ForegroundColor Green
}