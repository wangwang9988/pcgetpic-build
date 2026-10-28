#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyLinuxBrandIcon } from '../../../browser/scripts/apply-linux-brand-icon.mjs';

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
  if (!process.env.TUGET_LICENSE_HMAC_SECRET || !process.env.TUGET_LICENSE_HMAC_SECRET.trim()) {
    const serverEnvPath = path.join(workspaceRoot, 'server', '.env');
    if (fs.existsSync(serverEnvPath)) {
      const lines = fs.readFileSync(serverEnvPath, 'utf8').split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if ((key === 'TUGET_LICENSE_HMAC_SECRET' || key === 'HMAC_SECRET_TUGET') && val) {
          process.env.TUGET_LICENSE_HMAC_SECRET = val;
          break;
        }
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

function resolveChromiumPlatform(targetTriple = '') {
  const triple = String(targetTriple || '');
  if (triple.includes('-apple-darwin')) {
    return triple.startsWith('x86_64') ? 'mac-x64' : 'mac-arm64';
  }
  if (triple.includes('-linux-')) return 'linux64';
  if (triple.includes('-windows-')) return 'win64';
  if (process.platform === 'win32') return 'win64';
  if (process.platform === 'darwin') {
    if (triple.startsWith('x86_64')) return 'mac-x64';
    if (triple.startsWith('aarch64')) return 'mac-arm64';
    return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  }
  return 'linux64';
}

function resolvePlatformTauriConfig(chromiumPlatform) {
  if (chromiumPlatform === 'win64') {
    return path.join(clientTauriDir, 'tauri.windows.conf.json');
  }
  if (chromiumPlatform === 'mac-arm64' || chromiumPlatform === 'mac-x64') {
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

function applyMacosChromiumBrandIcon(appBundlePath) {
  const brandPng = path.join(browserDir, 'assets', 'tuget-browser.png');
  if (!fs.existsSync(brandPng) || !fs.existsSync(appBundlePath)) {
    return;
  }
  const iconsetDir = path.join(os.tmpdir(), `tuget-browser-${Date.now()}.iconset`);
  const generatedIcns = path.join(os.tmpdir(), `tuget-browser-${Date.now()}.icns`);
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.rmSync(generatedIcns, { force: true });
  fs.mkdirSync(iconsetDir, { recursive: true });

  const sizes = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png'],
  ];
  for (const [sz, fileName] of sizes) {
    execFileSync(
      'sips',
      ['-z', String(sz), String(sz), brandPng, '--out', path.join(iconsetDir, fileName)],
      { stdio: 'ignore' },
    );
  }
  execFileSync('iconutil', ['-c', 'icns', iconsetDir, '-o', generatedIcns], { stdio: 'inherit' });

  const replaceIcnsAndPatchApp = (bundleDir) => {
    const resDir = path.join(bundleDir, 'Contents', 'Resources');
    if (fs.existsSync(resDir)) {
      for (const entry of fs.readdirSync(resDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.icns')) {
          fs.copyFileSync(generatedIcns, path.join(resDir, entry.name));
        }
      }
      fs.copyFileSync(generatedIcns, path.join(resDir, 'app.icns'));
      const assetsCar = path.join(resDir, 'Assets.car');
      if (fs.existsSync(assetsCar)) {
        fs.rmSync(assetsCar, { force: true });
      }
    }
    const infoPlist = path.join(bundleDir, 'Contents', 'Info.plist');
    if (fs.existsSync(infoPlist)) {
      try {
        execFileSync('plutil', ['-remove', 'CFBundleIconName', infoPlist], { stdio: 'ignore' });
      } catch {
        // Ignore if key does not exist
      }
      try {
        execFileSync('plutil', ['-replace', 'CFBundleIconFile', '-string', 'app.icns', infoPlist], {
          stdio: 'ignore',
        });
      } catch {
        // Ignore
      }
    }
  };

  replaceIcnsAndPatchApp(appBundlePath);

  const frameworksDir = path.join(appBundlePath, 'Contents', 'Frameworks');
  if (fs.existsSync(frameworksDir)) {
    const walkNested = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.endsWith('.app')) {
            replaceIcnsAndPatchApp(fullPath);
          } else {
            walkNested(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.icns')) {
          fs.copyFileSync(generatedIcns, fullPath);
        }
      }
    };
    walkNested(frameworksDir);
  }

  fs.rmSync(iconsetDir, { recursive: true, force: true });
  fs.rmSync(generatedIcns, { force: true });
  console.log('Applied TuGet brand icon (tuget-browser.png -> app.icns) to macOS Chromium bundle.');
}

function applyLinuxChromiumBrandIcon(chromiumDir = null) {
  const brandPng = path.join(browserDir, 'assets', 'tuget-browser.png');
  if (!fs.existsSync(brandPng)) {
    return;
  }
  applyLinuxBrandIcon({
    brandPng,
    chromiumDir: chromiumDir && fs.existsSync(chromiumDir) ? chromiumDir : '',
    tauriLinuxDir: path.join(clientTauriDir, 'linux'),
  });
}

function signMacosChromiumAppBundle(chromiumRoot, signingIdentity, childEntitlements) {
  if (!fs.existsSync(chromiumRoot)) return;
  for (const entry of fs.readdirSync(chromiumRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue;
    const appPath = path.join(chromiumRoot, entry.name);
    applyMacosChromiumBrandIcon(appPath);
    const macOsDir = path.join(appPath, 'Contents', 'MacOS');
    if (fs.existsSync(macOsDir)) {
      for (const bin of fs.readdirSync(macOsDir, { withFileTypes: true })) {
        if (bin.isFile()) fs.chmodSync(path.join(macOsDir, bin.name), 0o755);
      }
    }
    const frameworksDir = path.join(appPath, 'Contents', 'Frameworks');
    if (fs.existsSync(frameworksDir)) {
      // 1. Sign nested dylibs and helper executables (crashpad / app_mode_loader / web_app_shortcut_copier) inside Frameworks
      const innerLeafBinaries = collectMatchingPaths(
        frameworksDir,
        (fullPath, d) =>
          d.isFile() &&
          !d.name.startsWith('.') &&
          (d.name.endsWith('.dylib') ||
            d.name === 'chrome_crashpad_handler' ||
            d.name === 'app_mode_loader' ||
            d.name === 'web_app_shortcut_copier' ||
            path.basename(path.dirname(fullPath)) === 'Helpers'),
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
    execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], {
      stdio: 'inherit',
    });
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

const ALLOWED_INSTALLER_HOSTS = new Set([
  'dl.webtongbu.com',
  'tuget.yueding168.com',
  'downpictures.com',
  'www.downpictures.com',
  'dl.downpictures.com',
]);

function isValidInstallerUrl(currentUrl, expectedSuffix) {
  if (typeof currentUrl !== 'string') return false;
  const trimmed = currentUrl.trim();
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      ALLOWED_INSTALLER_HOSTS.has(parsed.hostname.toLowerCase()) &&
      parsed.pathname.toLowerCase().endsWith(expectedSuffix)
    );
  } catch {
    return false;
  }
}

function ensureValidInstallerUrl(currentUrl, expectedSuffix, fallbackUrl) {
  return isValidInstallerUrl(currentUrl, expectedSuffix) ? currentUrl.trim() : fallbackUrl;
}

function syncWebsiteVersionManifests(clientVersion, builtChromiumPlatform) {
  const defaultPlatformUrls = {
    desktopDownloadUrl: ['.exe', 'https://dl.webtongbu.com/TuGet-Client/TuGet-Setup.exe'],
    macArm64DownloadUrl: ['arm64.dmg', 'https://dl.webtongbu.com/TuGet-Client/TuGet-macOS-arm64.dmg'],
    macX64DownloadUrl: ['x64.dmg', 'https://dl.webtongbu.com/TuGet-Client/TuGet-macOS-x64.dmg'],
    linuxDebDownloadUrl: ['.deb', 'https://dl.webtongbu.com/TuGet-Client/TuGet-Linux-x64.deb'],
    linuxRpmDownloadUrl: ['.rpm', 'https://dl.webtongbu.com/TuGet-Client/TuGet-Linux-x64.rpm'],
  };

  const builtUrlKeysByPlatform = {
    win64: new Set(['desktopDownloadUrl']),
    'mac-arm64': new Set(['macArm64DownloadUrl']),
    'mac-x64': new Set(['macX64DownloadUrl']),
    linux64: new Set(['linuxDebDownloadUrl', 'linuxRpmDownloadUrl']),
  };
  const activeUrlKeys = builtUrlKeysByPlatform[builtChromiumPlatform] || new Set();

  const isWindowsTarget = builtChromiumPlatform === 'win64';
  const isMacTarget = builtChromiumPlatform === 'mac-arm64' || builtChromiumPlatform === 'mac-x64';
  const isLinuxTarget = builtChromiumPlatform === 'linux64';

  const applyPlatformUpdates = (manifest, isMarketingSnapshot = false) => {
    if (isWindowsTarget) {
      manifest.desktopVersion = clientVersion;
      if (isMarketingSnapshot) {
        manifest.version = clientVersion;
        manifest.desktopUpdatedAt = new Date().toISOString().slice(0, 10);
      }
    }
    if (!isMarketingSnapshot) {
      if (isMacTarget) {
        manifest.macVersion = clientVersion;
      }
      if (isLinuxTarget) {
        manifest.linuxVersion = clientVersion;
      }
    } else {
      delete manifest.macVersion;
      delete manifest.linuxVersion;
    }
    for (const [k, [expectedSuffix, fallbackUrl]] of Object.entries(defaultPlatformUrls)) {
      if (activeUrlKeys.has(k)) {
        manifest[k] = ensureValidInstallerUrl(manifest[k], expectedSuffix, fallbackUrl);
      } else if (manifest[k] !== undefined && !isValidInstallerUrl(manifest[k], expectedSuffix)) {
        delete manifest[k];
      }
    }
  };

  const tugetWebsiteVersionPath = path.join(workspaceRoot, 'tuget-website', 'public', 'version.json');
  if (fs.existsSync(tugetWebsiteVersionPath)) {
    const manifest = JSON.parse(fs.readFileSync(tugetWebsiteVersionPath, 'utf8'));
    applyPlatformUpdates(manifest, false);
    fs.writeFileSync(tugetWebsiteVersionPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Updated tuget-website/public/version.json (${builtChromiumPlatform}) -> ${clientVersion}`);
  }

  const mainWebsiteVersionPath = path.join(workspaceRoot, 'website', 'public', 'tuget-version.json');
  if (fs.existsSync(mainWebsiteVersionPath)) {
    const manifest = JSON.parse(fs.readFileSync(mainWebsiteVersionPath, 'utf8'));
    applyPlatformUpdates(manifest, true);
    fs.writeFileSync(mainWebsiteVersionPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`Updated website/public/tuget-version.json (${builtChromiumPlatform}) -> ${clientVersion}`);
  }
}

const { target, thin, skipSigning } = parseArgs(process.argv.slice(2));
loadLocalEnvIfPresent();

if (!process.env.TUGET_LICENSE_HMAC_SECRET || !process.env.TUGET_LICENSE_HMAC_SECRET.trim()) {
  throw new Error(
    'Missing required environment variable TUGET_LICENSE_HMAC_SECRET. Configure it in CI secrets or .env.local before building a release.',
  );
}

const chromiumPlatform = resolveChromiumPlatform(target);
const exeSuffix = chromiumPlatform === 'win64' ? '.exe' : '';
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

  if (chromiumPlatform === 'win64') {
    assertNoDynamicMsvcRuntime(browserExe, 'Browser Engine');
    assertNoDynamicMsvcRuntime(nativeHostExe, 'Native Host');
  }

  // 5. Stage browser-engine runtime
  fs.rmSync(browserStageDir, { recursive: true, force: true });
  fs.mkdirSync(browserStageDir, { recursive: true });

  fs.copyFileSync(browserExe, path.join(browserStageDir, `tuget-browser${exeSuffix}`));
  fs.copyFileSync(nativeHostExe, path.join(browserStageDir, `tuget-native-host${exeSuffix}`));
  const rawChromiumVersion = JSON.parse(
    fs.readFileSync(path.join(browserDir, 'chromium-version.json'), 'utf8'),
  );
  const platformChromiumEntry = rawChromiumVersion.platforms?.[chromiumPlatform] || {};
  const stagedChromiumVersion = {
    ...rawChromiumVersion,
    version: platformChromiumEntry.version || rawChromiumVersion.version,
    revision: platformChromiumEntry.revision || rawChromiumVersion.revision,
    platform: chromiumPlatform,
    url: platformChromiumEntry.url || rawChromiumVersion.url,
    sha256: platformChromiumEntry.sha256 || rawChromiumVersion.sha256,
  };
  fs.writeFileSync(
    path.join(browserStageDir, 'chromium-version.json'),
    `${JSON.stringify(stagedChromiumVersion, null, 2)}\n`,
    'utf8',
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
  } else if (process.platform === 'linux') {
    applyLinuxChromiumBrandIcon(path.join(browserStageDir, 'chromium'));
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
if (process.platform === 'linux' && thin) {
  applyLinuxChromiumBrandIcon(null);
}
const cargoTargetArgs = target ? ['--target', target] : [];
const signArgs = skipSigning ? ['--no-sign'] : [];
const releaseConfig = path.join(clientTauriDir, 'tauri.release.conf.json');
const platformConfig = resolvePlatformTauriConfig(chromiumPlatform);
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
const chromiumHoldDir = path.join(clientTauriDir, 'release-resources', 'chromium-temp-hold');
const stagedChromiumDir = path.join(browserStageDir, 'chromium');
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
  if (process.platform === 'darwin' && !thin && fs.existsSync(stagedChromiumDir)) {
    fs.rmSync(chromiumHoldDir, { recursive: true, force: true });
    fs.renameSync(stagedChromiumDir, chromiumHoldDir);
  }
  const bundleArgs = process.platform === 'darwin' ? ['--bundles', 'app', '--no-sign'] : [];
  const tauriArgs = [
    'run',
    'tauri',
    '--',
    'build',
    ...bundleArgs,
    ...configArgs,
    ...(process.platform === 'darwin' ? [] : signArgs),
    ...cargoTargetArgs,
  ];
  const tauriEnv = { ...process.env };
  if (process.platform === 'darwin') {
    delete tauriEnv.APPLE_ID;
    delete tauriEnv.APPLE_PASSWORD;
    delete tauriEnv.APPLE_TEAM_ID;
    delete tauriEnv.APPLE_SIGNING_IDENTITY;
  }
  run(clientDir, 'npm', tauriArgs, tauriEnv);
} finally {
  if (fs.existsSync(chromiumHoldDir)) {
    fs.rmSync(stagedChromiumDir, { recursive: true, force: true });
    fs.renameSync(chromiumHoldDir, stagedChromiumDir);
  }
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

if (chromiumPlatform === 'win64') {
  copyNewestMatchingInstaller(
    path.join(bundleRoot, 'nsis'),
    (name) => name.endsWith('-setup.exe'),
    'TuGet-Setup.exe',
    toolsDownloadDir,
  );
} else if (chromiumPlatform === 'mac-arm64' || chromiumPlatform === 'mac-x64') {
  const macosAppPath = path.join(bundleRoot, 'macos', 'TuGet.app');
  if (!thin && fs.existsSync(stagedChromiumDir)) {
    const appChromiumDest = path.join(
      macosAppPath,
      'Contents',
      'Resources',
      'browser-engine',
      'chromium',
    );
    fs.rmSync(appChromiumDest, { recursive: true, force: true });
    execFileSync('cp', ['-a', stagedChromiumDir, appChromiumDest], { stdio: 'inherit' });
  }
  const identity = (process.env.APPLE_SIGNING_IDENTITY || '').trim() || '-';
  const mainEntitlements = path.join(clientTauriDir, 'macos', 'entitlements.plist');
  if (!skipSigning) {
    runCodesign(
      path.join(macosAppPath, 'Contents', 'MacOS', 'tuget-client'),
      identity,
      mainEntitlements,
    );
    runCodesign(macosAppPath, identity, mainEntitlements);
    execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', macosAppPath], {
      stdio: 'inherit',
    });
  }
  const canonicalDmg =
    chromiumPlatform === 'mac-x64' ? 'TuGet-macOS-x64.dmg' : 'TuGet-macOS-arm64.dmg';
  const dmgDir = path.join(bundleRoot, 'dmg');
  fs.mkdirSync(dmgDir, { recursive: true });
  const dmgPath = path.join(dmgDir, canonicalDmg);
  fs.rmSync(dmgPath, { force: true });
  execFileSync(
    'hdiutil',
    ['create', '-volname', 'TuGet', '-srcfolder', macosAppPath, '-ov', '-format', 'UDZO', dmgPath],
    { stdio: 'inherit' },
  );
  if (!skipSigning && identity !== '-') {
    runCodesign(dmgPath, identity, null);
    const appleId = (process.env.APPLE_ID || '').trim();
    const applePassword = (process.env.APPLE_PASSWORD || '').trim();
    const appleTeamId = (process.env.APPLE_TEAM_ID || '').trim();
    if (appleId && applePassword && appleTeamId) {
      execFileSync(
        'xcrun',
        [
          'notarytool',
          'submit',
          dmgPath,
          '--apple-id',
          appleId,
          '--password',
          applePassword,
          '--team-id',
          appleTeamId,
          '--wait',
        ],
        { stdio: 'inherit' },
      );
      execFileSync('xcrun', ['stapler', 'staple', dmgPath], { stdio: 'inherit' });
    }
  }
  if (toolsDownloadDir) {
    fs.mkdirSync(toolsDownloadDir, { recursive: true });
    fs.copyFileSync(dmgPath, path.join(toolsDownloadDir, canonicalDmg));
  }
} else if (chromiumPlatform === 'linux64') {
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

syncWebsiteVersionManifests(tauriConf.version, chromiumPlatform);

console.log('\nTuGet cross-platform release build completed successfully!');
