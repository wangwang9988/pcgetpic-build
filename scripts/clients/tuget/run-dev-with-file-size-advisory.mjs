import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));
const launcher = fileURLToPath(new URL('./启动完整开发环境.ps1', import.meta.url));
let advisoryWatcher;

try {
  const { startWorkspaceWatcher } = await import('./file-size-advisory.mjs');
  advisoryWatcher = startWorkspaceWatcher(workspaceRoot);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[tuget-file-size] 无法启动提醒观察器，开发环境仍会继续：${message}`);
}

const child = spawn(
  'pwsh',
  ['-NoProfile', '-File', launcher, ...process.argv.slice(2)],
  { cwd: workspaceRoot, stdio: 'inherit' },
);

const closeWatcher = () => {
  advisoryWatcher?.close();
  advisoryWatcher = undefined;
};

child.once('error', (error) => {
  console.error(`[tuget-dev] 无法启动完整开发环境：${error.message}`);
  closeWatcher();
  process.exitCode = 1;
});

child.once('exit', (code, signal) => {
  closeWatcher();
  if (signal) {
    console.warn(`[tuget-dev] 开发环境因信号 ${signal} 退出。`);
  }
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    closeWatcher();
    if (child.exitCode === null && child.signalCode === null) {
      try {
        child.kill(signal);
      } catch {
        // The shared console may already have delivered the signal to PowerShell.
      }
    }
  });
}
