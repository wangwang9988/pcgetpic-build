#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
const clientDir = path.join(workspaceRoot, 'client');
const clientTauriDir = path.join(clientDir, 'src-tauri');
const browserDir = path.join(workspaceRoot, 'browser');

function parseArgs(argv) {
  let target = '';
  let skipSigning = false;
  let skipCi = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target' && argv[i + 1]) {
      target = argv[++i];
    } else if (arg === '--skip-signing') {
      skipSigning = true;
    } else if (arg === '--skip-ci') {
      skipCi = true;
    }
  }
  return { target, skipSigning, skipCi };
}

function loadLocalEnvIfPresent() {
  for (const candidate of [
    path.join(clientDir, '.env.local'),
    path.join(workspaceRoot, '.env.local'),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    const lines = fs.readFileSync(candidate, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

function run(cwd, cmd, args, env = process.env) {
  console.log(`\n==> [${path.basename(cwd)}] ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32' && (cmd === 'npm' || cmd === 'npx'),
  });
}

const { target, skipSigning, skipCi } = parseArgs(process.argv.slice(2));
loadLocalEnvIfPresent();

// Map DANGTU_SIGN_CERT_* to TUGET_SIGN_CERT_* if set so shared sign.ps1 can read either
for (const suffix of ['PATH', 'PASSWORD', 'SHA1', 'EXPECTED_THUMBPRINT']) {
  const dangtuKey = `DANGTU_SIGN_CERT_${suffix}`;
  const tugetKey = `TUGET_SIGN_CERT_${suffix}`;
  if (process.env[dangtuKey] && !process.env[tugetKey]) {
    process.env[tugetKey] = process.env[dangtuKey];
  }
}

const tauriConf = JSON.parse(fs.readFileSync(path.join(clientTauriDir, 'tauri.conf.json'), 'utf8'));

console.log(
  `DangTu Cross-Platform Release Build (version=${tauriConf.version}, platform=${process.platform}, target=${target || 'host'}, skipSigning=${skipSigning})`,
);

// 1. Install dependencies & verify scraper bundles
if (!skipCi) {
  run(clientDir, 'npm', ['ci']);
}
run(clientDir, 'npm', ['run', 'build:scraper']);
run(clientDir, 'npm', ['run', 'test:scraper-build']);

// 2. Build Tauri installer bundle
const cargoTargetArgs = target ? ['--target', target] : [];
const signArgs = skipSigning ? ['--no-sign'] : [];
const configArgs = [];

const winInstallerSigningEnabled =
  process.platform === 'win32' &&
  !skipSigning &&
  Boolean(
    (
      process.env.TUGET_SIGN_CERT_PATH ||
      process.env.TUGET_SIGN_CERT_SHA1 ||
      process.env.GETPIC_SIGN_CERT_PATH ||
      process.env.GETPIC_SIGN_CERT_SHA1 ||
      ''
    ).trim(),
  );

const macSigningIdentity =
  process.platform === 'darwin' && !skipSigning
    ? (process.env.APPLE_SIGNING_IDENTITY || '').trim()
    : '';

if (process.platform === 'win32' && !skipSigning && !winInstallerSigningEnabled) {
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    throw new Error(
      'Windows signing certificate (DANGTU_SIGN_CERT_PATH / DANGTU_SIGN_CERT_SHA1 or TUGET_SIGN_CERT_*) is required for tagged Windows release builds unless --skip-signing is specified.',
    );
  }
  console.warn(
    '[WARNING] Windows signing certificate is not configured; building Windows installer without Authenticode signature.',
  );
}

if (process.platform === 'darwin' && !skipSigning && !macSigningIdentity) {
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    throw new Error(
      'APPLE_SIGNING_IDENTITY is required for tagged macOS release builds unless --skip-signing is specified.',
    );
  }
  console.warn(
    '[WARNING] APPLE_SIGNING_IDENTITY is not set; building macOS bundle without Developer ID identity.',
  );
}

function resolvePlatformBundleTargets() {
  if (process.platform === 'win32') return ['nsis'];
  if (process.platform === 'darwin') return ['dmg', 'app'];
  return ['deb', 'rpm'];
}

let tempOverlayConfig = null;
try {
  // 显式按当前平台覆盖 bundle.targets，避免 tauri-bundler 在 macOS/Linux 上因 PackageType::Nsis 无 cfg 门控而尝试调用 makensis
  const overlayBundle = {
    targets: resolvePlatformBundleTargets(),
  };
  if (winInstallerSigningEnabled) {
    const signScript = path.join(browserDir, 'scripts', 'sign.ps1');
    if (fs.existsSync(signScript)) {
      overlayBundle.windows = {
        signCommand: {
          cmd: 'pwsh',
          args: ['-NoProfile', '-File', signScript, '-FilePath', '%1'],
        },
      };
    }
  }
  if (macSigningIdentity) {
    overlayBundle.macOS = {
      signingIdentity: macSigningIdentity,
    };
  }
  if (Object.keys(overlayBundle).length > 0) {
    tempOverlayConfig = path.join(os.tmpdir(), `dangtu-signing-${Date.now()}.json`);
    fs.writeFileSync(tempOverlayConfig, JSON.stringify({ bundle: overlayBundle }, null, 2), 'utf8');
    configArgs.push('--config', tempOverlayConfig);
  }

  const tauriArgs = [
    'run',
    'tauri',
    '--',
    'build',
    ...configArgs,
    ...signArgs,
    ...cargoTargetArgs,
  ];
  run(clientDir, 'npm', tauriArgs);
} finally {
  if (tempOverlayConfig && fs.existsSync(tempOverlayConfig)) {
    fs.rmSync(tempOverlayConfig, { force: true });
  }
}

// 3. Normalize installer filenames & archive to downloads directories
const copyArgs = ['scripts/copy-desktop-installer.mjs', ...cargoTargetArgs];
run(clientDir, 'node', copyArgs);

console.log('\nDangTu cross-platform release build completed successfully!');
