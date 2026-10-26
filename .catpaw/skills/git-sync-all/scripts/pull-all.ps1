param([switch]$Scan)

. (Join-Path $PSScriptRoot 'git-common.ps1')

# Root first, with recursion disabled. Each child then updates its own primary branch.
$repos = @('(root)') + $childRepos
$updated = 0; $uptodate = 0; $failed = 0; $repaired = 0; $skipped = 0

foreach ($repo in $repos) {
    $path = Get-RepoPath $repo
    if (-not (Test-Path -LiteralPath (Join-Path $path '.git'))) {
        Write-Output "[$repo] SKIPPED (repository not initialized)"
        $skipped++
        continue
    }
    try {
        $plan = Get-PrimaryBranchPlan $path $repo -Fetch
        if ($Scan) {
            $current = if ($plan.Current) { $plan.Current } else { 'DETACHED' }
            Write-Output "[$repo] $current -> $($plan.Branch); $($plan.Ahead) ahead, $($plan.Behind) behind"
            continue
        }
        Invoke-PrimaryUpdate $plan -UpdateRemote
        if ($plan.NeedsSwitch) { $repaired++ }
        if ($plan.Behind -gt 0) {
            Write-Output "[$repo] updated ($($plan.Behind) commits pulled); branch=$($plan.Branch)"
            $updated++
        } else {
            Write-Output "[$repo] up-to-date ($($plan.Ahead) unpushed commits); branch=$($plan.Branch)"
            $uptodate++
        }
    } catch {
        Write-Output "[$repo] FAILED - $($_.Exception.Message)"
        $failed++
    }
}

Write-Output "=== Summary: $updated updated, $uptodate up-to-date, $repaired repaired, $skipped skipped, $failed failed ==="
if ($failed -gt 0) { throw "$failed repositories failed; review preserved changes before retrying." }
