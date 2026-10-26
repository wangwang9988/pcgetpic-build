import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateProtocolSourceFingerprint } from './source-fingerprint.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), '..');

export function writeProtocolBuildFingerprint(root = projectRoot) {
  const resolvedRoot = path.resolve(root);
  const distDir = path.join(resolvedRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error(`Protocol dist directory does not exist: ${distDir}`);
  }

  const state = calculateProtocolSourceFingerprint(resolvedRoot);
  const markerPath = path.join(distDir, 'source-fingerprint.json');
  fs.writeFileSync(markerPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return markerPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const markerPath = writeProtocolBuildFingerprint();
  process.stdout.write(`${markerPath}\n`);
}
