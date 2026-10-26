"""Exercise sync scripts with disposable local remotes; never contact project remotes.

Run: python scripts/tests/test_git_sync_all.py
Set GIT_SYNC_TEST_SHELL=powershell to also exercise Windows PowerShell 5.1.
"""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / '.agents/skills/git-sync-all/scripts'
SHELL = shutil.which(os.environ.get('GIT_SYNC_TEST_SHELL', 'pwsh'))


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='git-sync-all-test-')
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.env = os.environ.copy()
        self.env.update({
            'GIT_CONFIG_NOSYSTEM': '1',
            'GIT_CONFIG_GLOBAL': str(self.base / 'empty.gitconfig'),
            'GIT_ALLOW_PROTOCOL': 'file',
            'GIT_TERMINAL_PROMPT': '0',
            'GIT_AUTHOR_NAME': 'Sync test', 'GIT_COMMITTER_NAME': 'Sync test',
            'GIT_AUTHOR_EMAIL': 'sync@example.invalid',
            'GIT_COMMITTER_EMAIL': 'sync@example.invalid',
        })
        self.child_seed, self.child_remote = self.seed('child', 'master')
        self.root_seed, self.root_remote = self.seed('root', 'main', publish=False)
        self.git(self.root_seed, 'submodule', 'add', '-b', 'master', str(self.child_remote), 'browser')
        self.commit(self.root_seed, 'add browser')
        self.git(self.root_seed, 'push', '-u', 'origin', 'main')
        self.work = self.base / 'work'
        self.git(self.base, 'clone', str(self.root_remote), str(self.work))
        self.git(self.work, 'submodule', 'update', '--init')
        self.child = self.work / 'browser'
        self.git(self.child, 'checkout', 'master')
        self.git(self.work, 'config', 'submodule.recurse', 'true')
        self.git(self.work, 'config', 'push.recurseSubmodules', 'on-demand')
        self.scripts = self.work / '.agents/skills/git-sync-all/scripts'
        shutil.copytree(SOURCE, self.scripts)

    def git(self, path, *args, check=True):
        result = subprocess.run(
            ['git', '-C', str(path), *args], env=self.env, capture_output=True,
            text=True, encoding='utf-8', errors='replace', timeout=30,
        )
        if check and result.returncode:
            self.fail(f'git {args}: {result.stdout}\n{result.stderr}')
        return result.stdout.strip()

    def seed(self, name, branch, publish=True):
        remote, seed = self.base / f'{name}.git', self.base / f'{name}-seed'
        self.git(self.base, 'init', '--bare', f'--initial-branch={branch}', str(remote))
        self.git(self.base, 'init', f'--initial-branch={branch}', str(seed))
        (seed / '.gitignore').write_text('.agents/\n', encoding='utf-8')
        (seed / 'tracked.txt').write_text('initial\n', encoding='utf-8')
        self.commit(seed, 'initial')
        self.git(seed, 'remote', 'add', 'origin', str(remote))
        if publish:
            self.git(seed, 'push', '-u', 'origin', branch)
        return seed, remote

    def commit(self, path, message):
        self.git(path, 'add', '-A')
        self.git(path, 'commit', '-m', message)
        return self.git(path, 'rev-parse', 'HEAD')

    def advance(self, seed, branch, filename='remote.txt', contents='remote update\n'):
        (seed / filename).write_text(contents, encoding='utf-8')
        sha = self.commit(seed, 'remote update')
        self.git(seed, 'push', 'origin', branch)
        return sha

    def sync(self, mode, *flags, success=True):
        script = str(self.scripts / f'{mode}-all.ps1').replace("'", "''")
        options = ' '.join(flags)
        if mode == 'push':
            options += " -RequireRepoMessages -RepoMessages @{ '(root)' = @{ Title='test: root update'; Details=@('Record root changes') }; browser = @{ Title='test: browser update'; Details=@('Record browser changes') } }"
        command = f"try {{ & '{script}' {options} }} catch {{ Write-Output $_; exit 1 }}"
        result = subprocess.run(
            [SHELL, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
            env=self.env, capture_output=True, text=True, encoding='utf-8',
            errors='replace', timeout=60,
        )
        output = result.stdout + result.stderr
        if success:
            self.assertEqual(result.returncode, 0, output)
        else:
            self.assertNotEqual(result.returncode, 0, output)
        return output

    def assert_primary(self):
        self.assertEqual(self.git(self.work, 'branch', '--show-current'), 'main')
        self.assertEqual(self.git(self.child, 'branch', '--show-current'), 'master')

    def test_recursive_pull_preserves_child_branch_and_old_parent_stash(self):
        (self.work / 'tracked.txt').write_text('older stashed work\n')
        self.git(self.work, 'stash', 'push', '-m', 'user stash')
        old_stash = self.git(self.work, 'rev-parse', 'refs/stash')
        (self.child / 'tracked.txt').write_text('child staged work\n')
        self.git(self.child, 'add', 'tracked.txt')
        (self.child / 'untracked.txt').write_text('child untracked work\n')
        child_sha = self.advance(self.child_seed, 'master')
        seed_child = self.root_seed / 'browser'
        self.git(seed_child, 'fetch', 'origin')
        self.git(seed_child, 'merge', '--ff-only', 'origin/master')
        self.commit(self.root_seed, 'update child pointer')
        self.git(self.root_seed, 'push', 'origin', 'main')
        self.sync('pull')
        self.assert_primary()
        self.assertEqual(self.git(self.child, 'rev-parse', 'HEAD'), child_sha)
        self.assertEqual(self.git(self.work, 'rev-parse', 'refs/stash'), old_stash)
        self.assertIn('M  tracked.txt', self.git(self.child, 'status', '--porcelain'))
        self.assertEqual((self.child / 'untracked.txt').read_text(), 'child untracked work\n')
        self.assertEqual(self.git(self.work, 'config', 'submodule.recurse'), 'true')

    def test_pull_preserves_index_worktree_untracked_and_existing_stash(self):
        (self.work / 'tracked.txt').write_text('old stash\n')
        self.git(self.work, 'stash', 'push')
        old_stash = self.git(self.work, 'rev-parse', 'refs/stash')
        (self.work / 'tracked.txt').write_text('staged\n')
        self.git(self.work, 'add', 'tracked.txt')
        (self.work / 'tracked.txt').write_text('unstaged\n')
        (self.work / 'untracked.txt').write_text('untracked\n')
        index = self.git(self.work, 'diff', '--cached')
        worktree = self.git(self.work, 'diff')
        self.advance(self.root_seed, 'main')
        self.sync('pull')
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'diff', '--cached'), index)
        self.assertEqual(self.git(self.work, 'diff'), worktree)
        self.assertEqual(self.git(self.work, 'rev-parse', 'refs/stash'), old_stash)
        self.assertEqual((self.work / 'untracked.txt').read_text(), 'untracked\n')

    def test_push_returns_feature_to_main_and_ignores_push_refspec(self):
        self.git(self.work, 'checkout', '-b', 'feature')
        (self.work / 'feature.txt').write_text('local commit\n')
        sha = self.commit(self.work, 'feature work')
        self.git(self.work, 'config', 'remote.origin.push', 'refs/heads/main:refs/heads/wrong')
        self.sync('push')
        self.assert_primary()
        self.assertEqual(self.git(self.root_remote, 'rev-parse', 'main'), sha)
        self.assertEqual(self.git(self.root_remote, 'branch', '--format=%(refname:short)'), 'main')
        self.assertEqual(self.git(self.work, 'rev-parse', '--abbrev-ref', '@{u}'), 'origin/main')

    def test_detached_commits_and_uncommitted_changes_are_committed_on_main(self):
        self.git(self.work, 'checkout', '--detach')
        (self.work / 'detached.txt').write_text('detached commit\n')
        detached = self.commit(self.work, 'detached work')
        (self.work / 'tracked.txt').write_text('staged work\n')
        self.git(self.work, 'add', 'tracked.txt')
        (self.work / 'untracked.txt').write_text('untracked work\n')
        self.sync('push')
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD^'), detached)
        self.assertEqual(self.git(self.root_remote, 'rev-parse', 'main'), self.git(self.work, 'rev-parse', 'HEAD'))
        self.assertEqual(self.git(self.work, 'status', '--porcelain'), '')

    def test_missing_local_main_is_recreated_without_losing_detached_commit(self):
        self.git(self.work, 'checkout', '--detach')
        self.git(self.work, 'branch', '-d', 'main')
        (self.work / 'local.txt').write_text('local detached work\n')
        sha = self.commit(self.work, 'detached work')
        self.sync('pull')
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD'), sha)

    def test_diverged_feature_is_not_switched_or_stashed(self):
        initial = self.git(self.work, 'rev-parse', 'HEAD')
        (self.work / 'main.txt').write_text('main work\n')
        main_sha = self.commit(self.work, 'main work')
        self.git(self.work, 'checkout', '-b', 'feature', initial)
        (self.work / 'feature.txt').write_text('feature work\n')
        sha = self.commit(self.work, 'feature work')
        (self.work / 'dirty.txt').write_text('keep me\n')
        before = self.git(self.work, 'status', '--porcelain')
        self.sync('push', success=False)
        self.assertEqual(self.git(self.work, 'branch', '--show-current'), 'feature')
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD'), sha)
        self.assertEqual(self.git(self.work, 'rev-parse', 'main'), main_sha)
        self.assertEqual(self.git(self.work, 'status', '--porcelain'), before)

    def test_remote_divergence_retains_local_commits(self):
        (self.work / 'local.txt').write_text('local work\n')
        sha = self.commit(self.work, 'local work')
        self.advance(self.root_seed, 'main')
        self.sync('pull', success=False)
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD'), sha)

    def test_wrong_upstream_does_not_change_pull_target(self):
        self.git(self.root_seed, 'checkout', '-b', 'wrong')
        self.advance(self.root_seed, 'wrong', 'wrong.txt')
        self.git(self.root_seed, 'checkout', 'main')
        expected = self.advance(self.root_seed, 'main')
        self.git(self.work, 'fetch', 'origin')
        self.git(self.work, 'branch', '--set-upstream-to=origin/wrong', 'main')
        self.sync('pull')
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD'), expected)
        self.assertFalse((self.work / 'wrong.txt').exists())
        self.assertEqual(self.git(self.work, 'rev-parse', '--abbrev-ref', '@{u}'), 'origin/main')

    def test_restore_conflict_retains_stash_and_reports_failure(self):
        (self.work / 'tracked.txt').write_text('local conflicting work\n')
        self.advance(self.root_seed, 'main', 'tracked.txt', 'remote conflicting work\n')
        output = self.sync('pull', success=False)
        self.assert_primary()
        self.assertIn('stash', output)
        self.assertIn('retained', output)
        self.assertEqual(self.git(self.work, 'show', 'refs/stash:tracked.txt'), 'local conflicting work')

    def test_scan_and_dry_run_do_not_switch_or_stage(self):
        self.git(self.work, 'checkout', '-b', 'feature')
        (self.work / 'dirty.txt').write_text('keep me\n')
        before = self.git(self.work, 'status', '--porcelain')
        for mode, flag in [('pull', '-Scan'), ('push', '-Scan'), ('push', '-DryRun')]:
            self.sync(mode, flag)
            self.assertEqual(self.git(self.work, 'branch', '--show-current'), 'feature')
            self.assertEqual(self.git(self.work, 'status', '--porcelain'), before)

    def test_failed_child_push_prevents_root_commit(self):
        git_dir = Path(self.git(self.child, 'rev-parse', '--absolute-git-dir'))
        hook = git_dir / 'hooks/pre-push'
        hook.write_text('#!/bin/sh\nexit 1\n', encoding='utf-8', newline='\n')
        hook.chmod(0o755)
        (self.child / 'tracked.txt').write_text('child work\n')
        before_root = self.git(self.work, 'rev-parse', 'HEAD')
        before_child = self.git(self.child, 'rev-parse', 'HEAD')
        self.sync('push', success=False)
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'rev-parse', 'HEAD'), before_root)
        self.assertNotEqual(self.git(self.child, 'rev-parse', 'HEAD'), before_child)
        self.assertEqual(self.git(self.root_remote, 'rev-parse', 'main'), before_root)

    def test_fetch_failure_does_not_touch_local_changes(self):
        self.git(self.work, 'remote', 'set-url', 'origin', str(self.base / 'missing.git'))
        (self.work / 'dirty.txt').write_text('keep me\n')
        before = self.git(self.work, 'status', '--porcelain')
        self.sync('pull', success=False)
        self.assert_primary()
        self.assertEqual(self.git(self.work, 'status', '--porcelain'), before)


if __name__ == '__main__':
    if not SHELL:
        raise SystemExit('PowerShell is required to run these integration tests.')
    unittest.main(verbosity=2)
