import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROTOCOL_SOURCE_FINGERPRINT_SCHEMA_VERSION = 1;

const scriptPath = fileURLToPath(import.meta.url);
const defaultProjectRoot = path.resolve(path.dirname(scriptPath), '..');
const includedPaths = [
  'src',
  'schema',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'scripts/source-fingerprint.mjs',
  'scripts/write-build-fingerprint.mjs',
  'scripts/build-browser-validator.mjs',
  'rust',
];

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function collectFiles(projectRoot) {
  const files = [];
  const compareNames = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

  function visit(absolutePath) {
    const stat = fs.lstatSync(absolutePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
        .sort((left, right) => compareNames(left.name, right.name));
      for (const entry of entries) visit(path.join(absolutePath, entry.name));
      return;
    }

    if (stat.isFile() || stat.isSymbolicLink()) {
      files.push({
        absolutePath,
        relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
        isSymbolicLink: stat.isSymbolicLink(),
      });
    }
  }

  for (const includedPath of includedPaths) {
    const absolutePath = path.join(projectRoot, includedPath);
    if (fs.existsSync(absolutePath)) visit(absolutePath);
  }

  return files.sort((left, right) => compareNames(left.relativePath, right.relativePath));
}

export function calculateProtocolSourceFingerprint(projectRoot = defaultProjectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const files = collectFiles(resolvedRoot);
  const hash = crypto.createHash('sha256');

  for (const file of files) {
    const content = file.isSymbolicLink
      ? Buffer.from(`symlink:${fs.readlinkSync(file.absolutePath)}`, 'utf8')
      : fs.readFileSync(file.absolutePath);
    hash.update(file.relativePath, 'utf8');
    hash.update('\0');
    hash.update(String(content.length), 'utf8');
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }

  return {
    schemaVersion: PROTOCOL_SOURCE_FINGERPRINT_SCHEMA_VERSION,
    algorithm: 'sha256',
    fingerprint: hash.digest('hex'),
    fileCount: files.length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  process.stdout.write(`${JSON.stringify(calculateProtocolSourceFingerprint())}\n`);
}
