#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  let engineDir = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === '--engine-dir' || arg === '-EngineDirectory') && argv[i + 1]) {
      engineDir = path.resolve(argv[++i]);
    }
  }
  if (!engineDir) {
    throw new Error('Usage: node prepare-engine-release.mjs --engine-dir <path>');
  }
  return { engineDir };
}

function requiredFilesForPlatform() {
  if (process.platform === 'win32') {
    return [
      'tuget-browser.exe',
      'tuget-native-host.exe',
      'chromium/chrome.exe',
      'chromium/chrome.dll',
      'chromium/chrome_elf.dll',
      'chromium/icudtl.dat',
      'chromium/resources.pak',
      'chromium/locales/en-US.pak',
      'extensions/pro-getpic/manifest.json',
      'extensions/pro-getpic/tuget-build.json',
    ];
  }
  if (process.platform === 'darwin') {
    return [
      'tuget-browser',
      'tuget-native-host',
      'chromium/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      'chromium/Google Chrome for Testing.app/Contents/Info.plist',
      'extensions/pro-getpic/manifest.json',
      'extensions/pro-getpic/tuget-build.json',
    ];
  }
  return [
    'tuget-browser',
    'tuget-native-host',
    'chromium/chrome',
    'chromium/icudtl.dat',
    'chromium/resources.pak',
    'chromium/locales/en-US.pak',
    'extensions/pro-getpic/manifest.json',
    'extensions/pro-getpic/tuget-build.json',
  ];
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex').toLowerCase();
}

function ensureExecutableMode(filePath) {
  const currentMode = fs.statSync(filePath).mode & 0o777;
  if (currentMode !== 0o755) {
    fs.chmodSync(filePath, 0o755);
  }
}

function ensureMacosAppPermissions(appBundlePath) {
  if (!fs.existsSync(appBundlePath)) return;
  const macOsDir = path.join(appBundlePath, 'Contents', 'MacOS');
  if (fs.existsSync(macOsDir)) {
    for (const entry of fs.readdirSync(macOsDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        ensureExecutableMode(path.join(macOsDir, entry.name));
      }
    }
  }
  const frameworksDir = path.join(appBundlePath, 'Contents', 'Frameworks');
  if (!fs.existsSync(frameworksDir)) return;
  const walkHelpers = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      const lstat = fs.lstatSync(fullPath);
      if (lstat.isSymbolicLink()) continue;
      if (lstat.isDirectory()) {
        if (entry.name.endsWith('.app')) {
          const helperMacOs = path.join(fullPath, 'Contents', 'MacOS');
          if (fs.existsSync(helperMacOs)) {
            for (const bin of fs.readdirSync(helperMacOs, { withFileTypes: true })) {
              if (bin.isFile()) {
                ensureExecutableMode(path.join(helperMacOs, bin.name));
              }
            }
          }
        } else {
          walkHelpers(fullPath);
        }
      } else if (
        lstat.isFile() &&
        (entry.name === 'chrome_crashpad_handler' ||
          entry.name === 'app_mode_loader' ||
          entry.name.startsWith('Google Chrome'))
      ) {
        ensureExecutableMode(fullPath);
      }
    }
  };
  walkHelpers(frameworksDir);
}

function collectFiles(rootDir, currentDir = rootDir, entries = []) {
  const names = fs.readdirSync(currentDir).sort();
  for (const name of names) {
    if (currentDir === rootDir && (name === 'engine-integrity.json' || name === 'release-manifest.json')) {
      continue;
    }
    const fullPath = path.join(currentDir, name);
    const lstat = fs.lstatSync(fullPath);
    if (lstat.isSymbolicLink()) {
      if (process.platform === 'win32') {
        throw new Error(`Engine must not contain links on Windows: ${fullPath}`);
      }
      // macOS Framework bundles inside Google Chrome for Testing.app use standard symlinks (Versions/Current).
      continue;
    }
    if (lstat.isDirectory()) {
      collectFiles(rootDir, fullPath, entries);
    } else if (lstat.isFile()) {
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
      entries.push({
        path: relPath,
        size: lstat.size,
        sha256: sha256File(fullPath),
      });
    }
  }
  return entries;
}

const { engineDir } = parseArgs(process.argv.slice(2));
const required = requiredFilesForPlatform();

for (const relative of required) {
  const fullPath = path.join(engineDir, relative);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile() || fs.statSync(fullPath).size === 0) {
    throw new Error(`Required engine component is missing or empty: ${relative}`);
  }
}

if (process.platform !== 'win32') {
  const executables = [
    'tuget-browser',
    'tuget-native-host',
    process.platform === 'darwin'
      ? 'chromium/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
      : 'chromium/chrome',
    'chromium/chrome_crashpad_handler',
    'chromium/chrome-wrapper',
  ];
  for (const rel of executables) {
    const full = path.join(engineDir, rel);
    if (fs.existsSync(full)) {
      ensureExecutableMode(full);
    }
  }
  if (process.platform === 'darwin') {
    ensureMacosAppPermissions(path.join(engineDir, 'chromium', 'Google Chrome for Testing.app'));
  }
}

const files = collectFiles(engineDir);
files.sort((a, b) => a.path.localeCompare(b.path));
if (files.length === 0 || files.length > 5000) {
  throw new Error(`Unexpected engine file count: ${files.length}`);
}

const inventory = {
  schemaVersion: 1,
  files,
  signatures: [],
};
fs.writeFileSync(
  path.join(engineDir, 'engine-integrity.json'),
  `${JSON.stringify(inventory, null, 2)}\n`,
  'utf8',
);
console.log(`Engine inventory verified and written: ${files.length} files`);
