import {
  existsSync,
  readFileSync,
  readdirSync,
  watch,
} from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url));

export const THRESHOLDS = Object.freeze({
  notice: 800,
  warning: 1000,
  critical: 1500,
});

const CODE_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.js',
  '.mjs',
  '.ps1',
  '.rs',
  '.scss',
  '.ts',
  '.tsx',
  '.vue',
]);

export const MONITORED_SCOPES = Object.freeze([
  {
    name: 'TuGet-Client',
    directories: [
      'TuGet-Client/src',
      'TuGet-Client/src-tauri/src',
      'TuGet-Client/src-tauri/tests',
      'TuGet-Client/tests',
    ],
    files: [],
    excludedPrefixes: ['TuGet-Client/src/assets/'],
  },
  {
    name: 'browser',
    directories: [
      'browser/src',
      'browser/scripts',
      'browser/test',
      'browser/tests',
    ],
    files: [],
    excludedPrefixes: [],
  },
  {
    name: 'Pro-GetPic client integration',
    directories: ['Pro-GetPic/tuget-client-integration'],
    files: [
      'Pro-GetPic/config/wxt/hooks.ts',
      'Pro-GetPic/config/wxt/index.ts',
      'Pro-GetPic/config/wxt/manifest.ts',
      'Pro-GetPic/entrypoints/background.ts',
      'Pro-GetPic/scripts/assert-build-mode.js',
      'Pro-GetPic/scripts/fix-all-manifests.js',
    ],
    excludedPrefixes: [],
  },
  {
    name: 'tuget-native-host',
    directories: [
      'tuget-native-host/src',
      'tuget-native-host/tests',
      'tuget-native-host/scripts',
    ],
    files: ['tuget-native-host/build.rs'],
    excludedPrefixes: [],
  },
  {
    name: 'tuget-protocol',
    directories: [
      'tuget-protocol/src',
      'tuget-protocol/test',
      'tuget-protocol/scripts',
    ],
    files: ['tuget-protocol/schema/protocol.schema.json'],
    excludedPrefixes: [],
  },
]);

const IGNORED_DIRECTORY_NAMES = new Set([
  '.cache',
  '.git',
  '.output',
  'chromium',
  'coverage',
  'dist',
  'extensions',
  'node_modules',
  'target',
]);

const LEVEL_PRIORITY = Object.freeze({ critical: 0, warning: 1, notice: 2 });

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function countLogicalLines(content) {
  if (content.length === 0) return 0;
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

export function classifyLineCount(lineCount) {
  if (lineCount > THRESHOLDS.critical) return 'critical';
  if (lineCount > THRESHOLDS.warning) return 'warning';
  if (lineCount > THRESHOLDS.notice) return 'notice';
  return null;
}

export function findScopeForPath(projectPath) {
  const normalizedPath = normalizePath(projectPath);
  for (const scope of MONITORED_SCOPES) {
    if (scope.excludedPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
      continue;
    }
    if (scope.files.includes(normalizedPath)) return scope;
    if (
      CODE_EXTENSIONS.has(extname(normalizedPath).toLowerCase())
      && scope.directories.some(
        (directory) => normalizedPath.startsWith(`${directory}/`),
      )
    ) {
      return scope;
    }
  }
  return null;
}

function inspectFile(root, absolutePath) {
  const resolvedRoot = resolve(root);
  const resolvedFile = resolve(absolutePath);
  const projectPath = normalizePath(relative(resolvedRoot, resolvedFile));
  const scope = findScopeForPath(projectPath);
  if (!scope || !existsSync(resolvedFile)) return null;

  try {
    const lineCount = countLogicalLines(readFileSync(resolvedFile, 'utf8'));
    const level = classifyLineCount(lineCount);
    return level ? { level, lineCount, projectPath, scope: scope.name } : null;
  } catch {
    return null;
  }
}

function collectDirectory(root, directory, output) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORY_NAMES.has(entry.name)) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collectDirectory(root, absolutePath, output);
    } else if (entry.isFile() && findScopeForPath(relative(root, absolutePath))) {
      output.add(absolutePath);
    }
  }
}

export function scanWorkspace(root = workspaceRoot) {
  const resolvedRoot = resolve(root);
  const files = new Set();

  for (const scope of MONITORED_SCOPES) {
    for (const directory of scope.directories) {
      collectDirectory(resolvedRoot, resolve(resolvedRoot, directory), files);
    }
    for (const file of scope.files) {
      const absolutePath = resolve(resolvedRoot, file);
      if (existsSync(absolutePath)) files.add(absolutePath);
    }
  }

  return [...files]
    .map((file) => inspectFile(resolvedRoot, file))
    .filter(Boolean)
    .sort((left, right) => (
      LEVEL_PRIORITY[left.level] - LEVEL_PRIORITY[right.level]
      || right.lineCount - left.lineCount
      || left.projectPath.localeCompare(right.projectPath)
    ));
}

function colorsEnabled() {
  return Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;
}

function colorize(value, level, useColor) {
  if (!useColor) return value;
  const code = level === 'critical' ? '1;31' : level === 'warning' ? '33' : '36';
  return `\u001B[${code}m${value}\u001B[0m`;
}

export function formatFinding(finding, useColor = colorsEnabled()) {
  const label = colorize(`[${finding.level.toUpperCase()}]`, finding.level, useColor);
  return `${label} [${finding.scope}] ${finding.projectPath} — ${finding.lineCount} 行`;
}

export function formatReport(findings, useColor = colorsEnabled()) {
  if (findings.length === 0) {
    return '[tuget-file-size] 当前协作范围内没有超过 800 行的文件。';
  }
  return [
    `[tuget-file-size] 共 ${findings.length} 个纯提醒；不会阻止运行、提交、测试或打包：`,
    ...findings.map((finding) => `  ${formatFinding(finding, useColor)}`),
  ].join('\n');
}

export function runReport(root = workspaceRoot) {
  console.log(formatReport(scanWorkspace(root)));
  return 0;
}

function watchDirectoriesForScope(root, scope) {
  const directories = new Set(scope.directories.map((directory) => resolve(root, directory)));
  for (const file of scope.files) directories.add(resolve(root, dirname(file)));
  return [...directories].filter((directory) => existsSync(directory));
}

export function startWorkspaceWatcher(root = workspaceRoot) {
  const resolvedRoot = resolve(root);
  const watchers = [];
  const pending = new Map();

  console.log(formatReport(scanWorkspace(resolvedRoot)));
  console.log('[tuget-file-size] 正在监听 TuGet 产品线协作代码；所有结果仅提醒。');

  const queueInspection = (filePath) => {
    const absolutePath = isAbsolute(filePath) ? filePath : resolve(resolvedRoot, filePath);
    const projectPath = normalizePath(relative(resolvedRoot, absolutePath));
    if (!findScopeForPath(projectPath)) return;

    const existing = pending.get(absolutePath);
    if (existing) clearTimeout(existing);
    pending.set(absolutePath, setTimeout(() => {
      pending.delete(absolutePath);
      const finding = inspectFile(resolvedRoot, absolutePath);
      if (finding) console.warn(`[tuget-file-size] 保存提醒\n  ${formatFinding(finding)}`);
    }, 75));
  };

  const watchedDirectories = new Set();
  for (const scope of MONITORED_SCOPES) {
    for (const directory of watchDirectoriesForScope(resolvedRoot, scope)) {
      if (watchedDirectories.has(directory)) continue;
      watchedDirectories.add(directory);
      try {
        const watcher = watch(directory, { recursive: true }, (_eventType, filename) => {
          if (filename) queueInspection(resolve(directory, filename.toString()));
        });
        watcher.on('error', (error) => {
          console.warn(`[tuget-file-size] 监听异常（${directory}）：${error.message}`);
        });
        watchers.push(watcher);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[tuget-file-size] 无法监听 ${directory}：${message}`);
      }
    }
  }

  return {
    close() {
      for (const watcher of watchers) watcher.close();
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    },
  };
}

function runCli() {
  if (process.argv.includes('--watch')) {
    const watcher = startWorkspaceWatcher(workspaceRoot);
    const close = () => {
      watcher.close();
      process.exitCode = 0;
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
    return;
  }
  process.exitCode = runReport(workspaceRoot);
}

const invokedScript = process.argv[1];
if (invokedScript && import.meta.url === pathToFileURL(resolve(invokedScript)).href) {
  runCli();
}
