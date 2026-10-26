#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
const protocolDir = path.join(workspaceRoot, 'tuget-protocol');
const proDir = path.join(workspaceRoot, 'Pro-GetPic');
const browserDir = path.join(workspaceRoot, 'browser');
const hostDir = path.join(workspaceRoot, 'tuget-native-host');
const clientDir = path.join(workspaceRoot, 'TuGet-Client');
const clientTauriDir = path.join(clientDir, 'src-tauri');
const releaseResourcesRoot = path.join(clientTauriDir, 'release-resources');
const browserStageDir = path.join(releaseResourcesRoot, 'browser-engine');

function parseArgs(argv) {
  let target = '';
  let thin = false;
  let skipSigning = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target' && argv[i + 1]) {
      target = argv[++i];
    } else if (arg === '--thin' || arg === '--skip-engine-download') {
      thin = true;
    } else if (arg === '--bundle-engine') {
      thin = false;
    } else if (arg === '--skip-signing') {
      skipSigning = true;
    }
  }
  return { target, thin, skipSigning };
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

function resolveChromiumPlatform(targetTriple) {
  if (process.platform === 'win32') return 'win64';
  if (process.platform === 'darwin') {
    if (targetTriple.startsWith('x86_64')) return 'mac-x64';
    if (targetTriple.startsWith('aarch64')) return 'mac-arm64';
    return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  }
  return 'linux64';
}

function resolvePlatformTauriConfig() {
  if (process.platform === 'win32') {
    return path.join(clientTauriDir, 'tauri.windows.conf.json');
  }
  if (process.platform === 'darwin') {
    return path.join(clientTauriDir, 'tauri.macos.conf.json');
  }
  return path.join(clientTauriDir, 'tauri.linux.conf.json');
}

function copyFilteredSnapshot(src, dest, excludedNames) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludedNames.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    fs.cpSync(srcPath, destPath, { recursive: true, verbatimSymlinks: true });
  }
}

function assertNoDynamicMsvcRuntime(filePath, label) {
  const text = fs.readFileSync(filePath).toString('latin1');
  const match = text.match(/(?:VCRUNTIME|MSVCP|CONCRT)\d+[A-Z_]*\.dll/i);
  if (match) {
    throw new Error(
      `${label} depends on dynamic MSVC runtime ${match[0]}: ${filePath}. Keep static CRT enabled in .cargo/config.toml.`,
    );
  }
}

function runCodesign(targetPath, signingIdentity, entitlementsPath = null) {
  const args = ['--force', '--options', 'runtime'];
  if (signingIdentity !== '-') {
    args.push('--timestamp');
  }
  if (entitlementsPath && fs.existsSync(entitlementsPath)) {
    args.push('--entitlements', entitlementsPath);
  }
  args.push('--sign', signingIdentity, targetPath);
  execFileSync('codesign', args, { stdio: 'inherit' });
}

function collectMatchingPaths(rootDir, predicate, results = []) {
  if (!fs.existsSync(rootDir)) return results;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(rootDir, entry.name);
    if (predicate(fullPath, entry)) {
      results.push(fullPath);
    } else if (entry.isDirectory()) {
      collectMatchingPaths(fullPath, predicate, results);
    }
  }
  return results;
}

function signMacosChromiumAppBundle(chromiumRoot, signingIdentity, childEntitlements) {
  if (!fs.existsSync(chromiumRoot)) return;
  for (const entry of fs.readdirSync(chromiumRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue;
    const appPath = path.join(chromiumRoot, entry.name);
    const macOsDir = path.join(appPath, 'Contents', 'MacOS');
    if (fs.existsSync(macOsDir)) {
      for (const bin of fs.readdirSync(macOsDir, { withFileTypes: true })) {
        if (bin.isFile()) fs.chmodSync(path.join(macOsDir, bin.name), 0o755);
      }
    }
    const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
    if (fs.existsSync(frameworksDir)) {
      // 1. Sign nested dylibs and helper executables (crashpad / app_mode_loader) inside Frameworks
      const innerLeafBinaries = collectMatchingPaths(
        frameworksDir,
        (_fullPath, d) =>
          d.isFile() &&
          (d.name.endsWith('.dylib') ||
            d.name === 'chrome_crashpad_handler' ||
            d.name === 'app_mode_loader'),
      );
      for (const leaf of innerLeafBinaries) {
        if (!leaf.endsWith('.dylib')) fs.chmodSync(leaf, 0o755);
        runCodesign(leaf, signingIdentity, null);
      }

      // 2. Sign nested Helper .app bundles with child (JIT) entitlements
      const helperApps = collectMatchingPaths(
        frameworksDir,
        (_fullPath, d) => d.isDirectory() && d.name.endsWith('.app'),
      );
      for (const helperApp of helperApps) {
        const helperMacOs = path.join(helperApp, 'Contents', 'MacOS');
        if (fs.existsSync(helperMacOs)) {
          for (const bin of fs.readdirSync(helperMacOs, { withFileTypes: true })) {
            if (bin.isFile()) fs.chmodSync(path.join(helperMacOs, bin.name), 0o755);
          }
        }
        runCodesign(helperApp, signingIdentity, childEntitlements);
      }

      // 3. Sign top-level .framework bundles inside Contents/Frameworks
      for (const fwEntry of fs.readdirSync(frameworksDir, { withFileTypes: true })) {
        if (fwEntry.isDirectory() && fwEntry.name.endsWith('.framework')) {
          runCodesign(path.join(frameworksDir, fwEntry.name), signingIdentity, null);
        }
      }
    }

    // 4. Sign outer Chromium .app bundle with child (JIT) entitlements
    runCodesign(appPath, signingIdentity, childEntitlements);
  }
}

function signMacosStagedBinaries(stageDir, signingIdentity, mainEntitlements, childEntitlements) {
  // Inside-out signing for bundled Chrome for Testing.app (requires V8 JIT child entitlements)
  signMacosChromiumAppBundle(path.join(stageDir, 'chromium'), signingIdentity, childEntitlements);

  // Pure Rust helper binaries only need minimal main entitlements (no JIT)
  for (const binName of ['tuget-browser', 'tuget-native-host']) {
    const binPath = path.join(stageDir, binName);
    if (fs.existsSync(binPath)) {
      fs.chmodSync(binPath, 0o755);
      runCodesign(binPath, signingIdentity, mainEntitlements);
    }
  }
}

function copyNewestMatchingInstaller(bundleDir, matcher, canonicalFileName, toolsDownloadDir) {
  if (!fs.existsSync(bundleDir)) {
    throw new Error(`Expected Tauri bundle directory does not exist: ${bundleDir}`);
  }
  const candidates = fs
    .readdirSync(bundleDir)
    .filter((name) => matcher(name) && name.toLowerCase() !== canonicalFileName.toLowerCase())
    .map((name) => path.join(bundleDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const canonicalPath = path.join(bundleDir, canonicalFileName);
  if (candidates.length > 0) {
    fs.copyFileSync(candidates[0], canonicalPath);
    console.log(`Normalized installer -> ${canonicalPath}`);
  } else if (!fs.existsSync(canonicalPath)) {
    throw new Error(`No installer matching ${canonicalFileName} found in ${bundleDir}`);
  }
  if (toolsDownloadDir) {
    fs.mkdirSync(toolsDownloadDir, { recursive: true });
    const toolsDest = path.join(toolsDownloadDir, canonicalFileName);
    fs.copyFileSync(canonicalPath, toolsDest);
    console.log(`Synced installer to tools downloads -> ${toolsDest}`);
  }
}

function syncWebsiteVersionManifests(clientVersion) {
  const tugetWebsiteVersionPath = path.join(workspaceRoot, 'tuget-website', 'public', 'version.json');
  if (fs.existsSync(tugetWebsiteVersionPath)) {
    const manifest = JSON.parse(fs.readFileSync(tugetWebsiteVersionPath, 'utf8'));
    manifest.desktopVersion = clientVersion;
    fs.writeFileSync(tugetWebsiteVersionPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Updated tuget-website/public/version.json desktopVersion -> ${clientVersion}`);
  }

  const mainWebsiteVersionPath = path.join(workspaceRoot, 'website', 'public', 'tuget-version.json');
  if (fs.existsSync(mainWebsiteVersionPath)) {
    const manifest = JSON.parse(fs.readFileSync(mainWebsiteVersionPath, 'utf8'));
    manifest.version = clientVersion;
    manifest.desktopUpdatedAt = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(mainWebsiteVersionPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Updated website/public/tuget-version.json version -> ${clientVersion}`);
  }
}

const { target, thin, skipSigning } = parseArgs(process.argv.slice(2));
loadLocalEnvIfPresent();

if (!process.env.TUGET_LICENSE_HMAC_SECRET || !process.env.TUGET_LICENSE_HMAC_SECRET.trim()) {
  throw new Error(
    'Missing required environment variable TUGET_LICENSE_HMAC_SECRET. Configure it in CI secrets or .env.local before building a release.',
  );
}

const exeSuffix = process.platform === 'win32' ? '.exe' : '';
const chromiumPlatform = resolveChromiumPlatform(target);
const tauriConf = JSON.parse(fs.readFileSync(path.join(clientTauriDir, 'tauri.conf.json'), 'utf8'));

console.log(
  `TuGet Cross-Platform Release Build (platform=${process.platform}, target=${target || 'host'}, chromium=${chromiumPlatform}, bundleEngine=${!thin})`,
);

// 1. Build tuget-protocol
run(protocolDir, 'npm', ['ci']);
run(protocolDir, 'npm', ['run', 'build']);

// 2. Build Pro-GetPic desktop in an isolated snapshot
const snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tuget-release-'));
const snapshotProtocol = path.join(snapshotRoot, 'tuget-protocol');
const snapshotPro = path.join(snapshotRoot, 'Pro-GetPic');
try {
  copyFilteredSnapshot(protocolDir, snapshotProtocol, new Set(['.git', 'node_modules']));
  copyFilteredSnapshot(
    proDir,
    snapshotPro,
    new Set([
      '.git',
      'node_modules',
      '.output',
      '.wxt',
      '.desktop-build-hidden-entrypoints',
      'docs',
      'reference',
      'scratch',
      'tmp',
    ]),
  );
  fs.rmSync(path.join(snapshotPro, 'entrypoints', 'newtab'), { recursive: true, force: true });
  fs.rmSync(path.join(snapshotPro, 'entrypoints', 'desktop-download-offscreen'), {
    recursive: true,
    force: true,
  });

  run(snapshotPro, 'npm', ['ci']);
  run(browserDir, 'npm', ['ci']);
  run(clientDir, 'npm', ['ci']);
  run(snapshotPro, 'npm', ['run', 'build:desktop']);

  const desktopOut = path.join(snapshotPro, '.output', 'desktop-chrome-mv3');
  run(browserDir, 'node', [
    path.join(browserDir, 'scripts', 'update-plugin.mjs'),
    '--source-dir',
    desktopOut,
  ]);
} finally {
  fs.rmSync(snapshotRoot, { recursive: true, force: true });
}

if (!thin) {
  // 3. Download Chromium for target platform
  run(browserDir, 'node', [
    path.join(browserDir, 'scripts', 'download-chromium.mjs'),
    '--platform',
    chromiumPlatform,
  ]);

  // 4. Build browser launcher and tuget-native-host
  const cargoTargetArgs = target ? ['--target', target] : [];
  run(browserDir, 'cargo', [
    'build',
    '--manifest-path',
    path.join(browserDir, 'Cargo.toml'),
    '--release',
    '--locked',
    ...cargoTargetArgs,
  ]);
  if (process.platform === 'win32' && !target) {
    run(browserDir, 'npm', ['run', 'verify']);
  }
  run(hostDir, 'cargo', [
    'build',
    '--manifest-path',
    path.join(hostDir, 'Cargo.toml'),
    '--release',
    '--locked',
    ...cargoTargetArgs,
  ]);

  const releaseSubDir = target ? path.join('target', target, 'release') : path.join('target', 'release');
  const browserExe = path.join(browserDir, releaseSubDir, `tuget-browser${exeSuffix}`);
  const nativeHostExe = path.join(hostDir, releaseSubDir, `tuget-native-host${exeSuffix}`);

  if (process.platform === 'win32') {
    assertNoDynamicMsvcRuntime(browserExe, 'Browser Engine');
    assertNoDynamicMsvcRuntime(nativeHostExe, 'Native Host');
  }

  // 5. Stage browser-engine runtime
  fs.rmSync(browserStageDir, { recursive: true, force: true });
  fs.mkdirSync(browserStageDir, { recursive: true });

  fs.copyFileSync(browserExe, path.join(browserStageDir, `tuget-browser${exeSuffix}`));
  fs.copyFileSync(nativeHostExe, path.join(browserStageDir, `tuget-native-host${exeSuffix}`));
  fs.copyFileSync(
    path.join(browserDir, 'chromium-version.json'),
    path.join(browserStageDir, 'chromium-version.json'),
  );

  if (process.platform === 'darwin') {
    execFileSync(
      'cp',
      ['-a', path.join(browserDir, 'chromium'), path.join(browserStageDir, 'chromium')],
      { stdio: 'inherit' },
    );
  } else {
    fs.cpSync(path.join(browserDir, 'chromium'), path.join(browserStageDir, 'chromium'), {
      recursive: true,
      verbatimSymlinks: true,
    });
  }
  fs.cpSync(
    path.join(browserDir, 'extensions', 'pro-getpic'),
    path.join(browserStageDir, 'extensions', 'pro-getpic'),
    { recursive: true },
  );
  fs.cpSync(path.join(browserDir, 'licenses'), path.join(browserStageDir, 'licenses'), {
    recursive: true,
  });

  if (process.platform === 'darwin' && !skipSigning) {
    const configuredIdentity = (process.env.APPLE_SIGNING_IDENTITY || '').trim();
    if (!configuredIdentity) {
      if (process.env.GITHUB_REF_TYPE === 'tag') {
        throw new Error(
          'APPLE_SIGNING_IDENTITY is required for tagged macOS release builds unless --skip-signing is specified.',
        );
      }
      console.warn(
        '[WARNING] APPLE_SIGNING_IDENTITY is not set; falling back to ad-hoc signing ("-"). This bundle will NOT pass macOS Gatekeeper.',
      );
    }
    const identity = configuredIdentity || '-';
    const mainEntitlements = path.join(clientTauriDir, 'macos', 'entitlements.plist');
    const childEntitlements = path.join(clientTauriDir, 'macos', 'entitlements.child.plist');
    signMacosStagedBinaries(browserStageDir, identity, mainEntitlements, childEntitlements);
  }

  const winSigningConfigured =
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

  if (winSigningConfigured) {
    run(workspaceRoot, 'pwsh', [
      '-NoProfile',
      '-File',
      path.join(__dirname, 'prepare-engine-release.ps1'),
      '-EngineDirectory',
      browserStageDir,
      '-Sign',
    ]);
  } else {
    run(workspaceRoot, 'node', [
      path.join(__dirname, 'prepare-engine-release.mjs'),
      '--engine-dir',
      browserStageDir,
    ]);
  }

  const extensionManifest = JSON.parse(
    fs.readFileSync(path.join(browserDir, 'extensions', 'pro-getpic', 'manifest.json'), 'utf8'),
  );
  const extensionMarker = JSON.parse(
    fs.readFileSync(path.join(browserDir, 'extensions', 'pro-getpic', 'tuget-build.json'), 'utf8'),
  );
  const browserPkg = JSON.parse(fs.readFileSync(path.join(browserDir, 'package.json'), 'utf8'));

  const releaseMetadata = {
    schemaVersion: 1,
    integrityManifest: 'engine-integrity.json',
    tugetComponentsSigned: Boolean(
      winSigningConfigured ||
        (process.platform === 'darwin' && !skipSigning && process.env.APPLE_SIGNING_IDENTITY),
    ),
    clientVersion: tauriConf.version,
    browserVersion: browserPkg.version,
    extensionVersion: extensionManifest.version,
    extensionBuildMode: extensionMarker.buildMode,
    protocolVersion: extensionMarker.protocolVersion,
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(browserStageDir, 'release-manifest.json'),
    `${JSON.stringify(releaseMetadata, null, 2)}\n`,
    'utf8',
  );
}

// 6. Build Tauri installer bundle
const cargoTargetArgs = target ? ['--target', target] : [];
const signArgs = skipSigning ? ['--no-sign'] : [];
const releaseConfig = path.join(clientTauriDir, 'tauri.release.conf.json');
const platformConfig = resolvePlatformTauriConfig();
const configArgs = thin
  ? ['--config', platformConfig]
  : ['--config', releaseConfig, '--config', platformConfig];

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
if (process.platform === 'win32' && !skipSigning && !winInstallerSigningEnabled) {
  if (process.env.GITHUB_REF_TYPE === 'tag') {
    throw new Error(
      'Windows signing certificate (TUGET_SIGN_CERT_PATH / TUGET_SIGN_CERT_SHA1) is required for tagged Windows release builds unless --skip-signing is specified.',
    );
  }
  console.warn(
    '[WARNING] Windows signing certificate is not configured; building Windows installer without Authenticode signature.',
  );
}
let tempWinSigningConfig = null;
try {
  if (winInstallerSigningEnabled) {
    tempWinSigningConfig = path.join(os.tmpdir(), `tuget-signing-${Date.now()}.json`);
    const signScript = path.join(browserDir, 'scripts', 'sign.ps1');
    fs.writeFileSync(
      tempWinSigningConfig,
      JSON.stringify(
        {
          bundle: {
            windows: {
              signCommand: {
                cmd: 'pwsh',
                args: ['-NoProfile', '-File', signScript, '-FilePath', '%1'],
              },
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    configArgs.push('--config', tempWinSigningConfig);
  }
  const tauriArgs = ['run', 'tauri', '--', 'build', ...configArgs, ...signArgs, ...cargoTargetArgs];
  run(clientDir, 'npm', tauriArgs);
} finally {
  if (tempWinSigningConfig && fs.existsSync(tempWinSigningConfig)) {
    fs.rmSync(tempWinSigningConfig, { force: true });
  }
}

// 7. Normalize installer filenames to match version.json and sync manifests
const bundleRoot = target
  ? path.join(clientTauriDir, 'target', target, 'release', 'bundle')
  : path.join(clientTauriDir, 'target', 'release', 'bundle');
const toolsDir = path.join(workspaceRoot, 'tools');
const toolsDownloadDir = fs.existsSync(toolsDir)
  ? path.join(toolsDir, 'public', 'downloads', 'TuGet-Client')
  : null;

if (process.platform === 'win32') {
  copyNewestMatchingInstaller(
    path.join(bundleRoot, 'nsis'),
    (name) => name.endsWith('-setup.exe'),
    'TuGet-Setup.exe',
    toolsDownloadDir,
  );
} else if (process.platform === 'darwin') {
  const canonicalDmg =
    chromiumPlatform === 'mac-x64' ? 'TuGet-macOS-x64.dmg' : 'TuGet-macOS-arm64.dmg';
  copyNewestMatchingInstaller(
    path.join(bundleRoot, 'dmg'),
    (name) => name.endsWith('.dmg'),
    canonicalDmg,
    toolsDownloadDir,
  );
} else if (process.platform === 'linux') {
  copyNewestMatchingInstaller(
    path.join(bundleRoot, 'deb'),
    (name) => name.endsWith('.deb'),
    'TuGet-Linux-x64.deb',
    toolsDownloadDir,
  );
  copyNewestMatchingInstaller(
    path.join(bundleRoot, 'rpm'),
    (name) => name.endsWith('.rpm'),
    'TuGet-Linux-x64.rpm',
    toolsDownloadDir,
  );
}

syncWebsiteVersionManifests(tauriConf.version);

console.log('\nTuGet cross-platform release build completed successfully!');
