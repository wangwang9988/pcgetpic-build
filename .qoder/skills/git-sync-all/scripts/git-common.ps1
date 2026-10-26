# Shared by pull-all.ps1 and push-all.ps1. Keep a copy in each software's skill.
$root = $PSScriptRoot
foreach ($i in 1..4) { $root = Split-Path -Parent $root }
$childRepos = @(
    'browser', 'client', 'cps-server', 'ec-nuxt', 'GetPic', 'next-GetPic',
    'oneget-website', 'Pro-GetPic', 'server', 'tools', 'TuGet-Client', 'website'
)
$masterRepos = @('browser', 'client', 'server', 'tools', 'TuGet-Client')

function Get-RepoPath($repo) {
    if ($repo -eq '(root)') { return $root }
    return Join-Path $root $repo
}

function Get-TargetBranch($repo) {
    if ($masterRepos -contains $repo) { return 'master' }
    return 'main'
}

function Invoke-RepoGit {
    param([string]$path, [string[]]$arguments, [switch]$AllowFailure)
    # Override per-machine recursive settings without changing user configuration.
    $ErrorActionPreference = 'Continue'
    $PSNativeCommandUseErrorActionPreference = $false
    $output = @(& git -C $path -c submodule.recurse=false -c fetch.recurseSubmodules=false `
        -c push.recurseSubmodules=no @arguments 2>&1 | ForEach-Object { "$_" })
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) {
        throw "git $($arguments -join ' ') failed ($code): $($output -join ' | ')"
    }
    return [pscustomobject]@{ Output = $output; ExitCode = $code }
}

function Get-GitText($path, [string[]]$arguments) {
    return ((Invoke-RepoGit $path $arguments).Output -join "`n").Trim()
}

function Test-Ancestor($path, $older, $newer) {
    $result = Invoke-RepoGit $path @('merge-base', '--is-ancestor', $older, $newer) -AllowFailure
    if ($result.ExitCode -gt 1) { throw "Cannot compare commits $older and $newer." }
    return $result.ExitCode -eq 0
}

function Get-PrimaryBranchPlan($path, $repo, [switch]$Fetch) {
    $branch = Get-TargetBranch $repo
    foreach ($state in @('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer')) {
        $statePath = Get-GitText $path @('rev-parse', '--git-path', $state)
        if (-not [IO.Path]::IsPathRooted($statePath)) { $statePath = Join-Path $path $statePath }
        if (Test-Path -LiteralPath $statePath) { throw "Unfinished Git operation ($state); preserve it before syncing." }
    }
    if (Get-GitText $path @('ls-files', '--unmerged')) { throw 'Unresolved index conflicts; preserve them before syncing.' }
    Get-GitText $path @('remote', 'get-url', 'origin') | Out-Null
    if ($Fetch) {
        Invoke-RepoGit $path @('fetch', '--no-recurse-submodules', '--no-tags', 'origin',
            "+refs/heads/${branch}:refs/remotes/origin/$branch") | Out-Null
    }
    $remoteRef = "refs/remotes/origin/$branch"
    $remoteSha = Get-GitText $path @('rev-parse', '--verify', "$remoteRef^{commit}")
    $headSha = Get-GitText $path @('rev-parse', '--verify', 'HEAD^{commit}')
    $current = (Invoke-RepoGit $path @('symbolic-ref', '--quiet', '--short', 'HEAD') -AllowFailure).Output -join ''
    $target = Invoke-RepoGit $path @('rev-parse', '--verify', "refs/heads/$branch^{commit}") -AllowFailure
    $exists = $target.ExitCode -eq 0
    $targetSha = if ($exists) { $target.Output -join '' } else { $remoteSha }

    # Check ancestry BEFORE leaving another branch or detached HEAD.
    if (Test-Ancestor $path $headSha $targetSha) {
        $effectiveSha = $targetSha
    } elseif (Test-Ancestor $path $targetSha $headSha) {
        $effectiveSha = $headSha
    } else {
        throw "HEAD $headSha diverges from $branch ($targetSha); no branch was switched and no commits were discarded."
    }
    $ahead = [int](Get-GitText $path @('rev-list', '--count', "$remoteSha..$effectiveSha"))
    $behind = [int](Get-GitText $path @('rev-list', '--count', "$effectiveSha..$remoteSha"))
    if ($ahead -gt 0 -and $behind -gt 0) {
        throw "$branch and origin/$branch diverged ($ahead ahead, $behind behind); reconcile on $branch before retrying."
    }
    return [pscustomobject]@{
        Repo = $repo; Path = $path; Branch = $branch; Current = $current
        HeadSha = $headSha; TargetSha = $targetSha; EffectiveSha = $effectiveSha
        RemoteRef = $remoteRef; RemoteSha = $remoteSha; Exists = $exists
        Ahead = $ahead; Behind = $behind; NeedsSwitch = $current -cne $branch
    }
}

function Assert-PrimaryBranch($path, $repo) {
    $expected = Get-TargetBranch $repo
    $actual = Get-GitText $path @('symbolic-ref', '--quiet', '--short', 'HEAD')
    if ($actual -cne $expected) { throw "Expected branch $expected, found $actual; stopping." }
}

function Set-PrimaryBranch($plan) {
    if ($plan.NeedsSwitch) {
        $from = if ($plan.Current) { $plan.Current } else { "detached HEAD $($plan.HeadSha)" }
        Write-Host "[$($plan.Repo)] $from -> $($plan.Branch)"
        if ($plan.Exists) {
            Invoke-RepoGit $plan.Path @('checkout', '--no-recurse-submodules', $plan.Branch, '--') | Out-Null
        } else {
            # Only the configured primary branch may be created; never a temporary branch.
            Invoke-RepoGit $plan.Path @('checkout', '--no-recurse-submodules', '-b', $plan.Branch, $plan.TargetSha, '--') | Out-Null
        }
        if ($plan.EffectiveSha -ne $plan.TargetSha) {
            Invoke-RepoGit $plan.Path @('merge', '--ff-only', $plan.EffectiveSha) | Out-Null
        }
    }
    Assert-PrimaryBranch $plan.Path $plan.Repo
    Invoke-RepoGit $plan.Path @('branch', "--set-upstream-to=origin/$($plan.Branch)", $plan.Branch) | Out-Null
}

function Save-LocalChanges($path) {
    # A dirty submodule alone creates no stash in its parent. Never pop a user's older stash.
    $changes = Get-GitText $path @('status', '--porcelain', '--ignore-submodules=all', '--untracked-files=all')
    if (-not $changes) { return $null }
    $previous = (Invoke-RepoGit $path @('rev-parse', '--verify', 'refs/stash') -AllowFailure).Output -join ''
    Invoke-RepoGit $path @('stash', 'push', '--include-untracked', '-m', "git-sync-all $([guid]::NewGuid())") | Out-Null
    $saved = Get-GitText $path @('rev-parse', '--verify', 'refs/stash')
    if ($saved -eq $previous) { throw 'Local changes were not stashed; stopping without applying any older stash.' }
    return $saved
}

function Restore-LocalChanges($path, $stashSha) {
    if (-not $stashSha) { return }
    $result = Invoke-RepoGit $path @('stash', 'apply', '--index', $stashSha) -AllowFailure
    if ($result.ExitCode -ne 0) {
        throw "Local changes need recovery; stash $stashSha is retained. $($result.Output -join ' | ')"
    }
    $entries = (Invoke-RepoGit $path @('stash', 'list', '--format=%gd %H')).Output
    foreach ($entry in $entries) {
        $parts = $entry -split ' ', 2
        if ($parts.Count -eq 2 -and $parts[1] -eq $stashSha) {
            Invoke-RepoGit $path @('stash', 'drop', $parts[0]) | Out-Null
            break
        }
    }
}

function Invoke-PrimaryUpdate($plan, [switch]$UpdateRemote) {
    $stashSha = $null
    try {
        if ($plan.NeedsSwitch -or ($UpdateRemote -and $plan.Behind -gt 0)) {
            $stashSha = Save-LocalChanges $plan.Path
        }
        Set-PrimaryBranch $plan
        if ($UpdateRemote -and $plan.Behind -gt 0) {
            Invoke-RepoGit $plan.Path @('merge', '--ff-only', $plan.RemoteSha) | Out-Null
        }
    } finally {
        Restore-LocalChanges $plan.Path $stashSha
    }
    Assert-PrimaryBranch $plan.Path $plan.Repo
}
