import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { calculateProtocolSourceFingerprint } from './source-fingerprint.mjs';
import { writeProtocolBuildFingerprint } from './write-build-fingerprint.mjs';

function write(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

test('protocol source fingerprint detects content and path changes', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tuget-protocol-fingerprint-'));
  try {
    write(projectRoot, 'package.json', '{"name":"fixture"}\n');
    write(projectRoot, 'src/index.ts', 'export const version = 1;\n');
    write(projectRoot, 'schema/protocol.schema.json', '{"type":"object"}\n');
    fs.mkdirSync(path.join(projectRoot, 'dist'), { recursive: true });

    const baseline = calculateProtocolSourceFingerprint(projectRoot);
    write(projectRoot, 'src/index.ts', 'export const version = 2;\n');
    assert.notEqual(calculateProtocolSourceFingerprint(projectRoot).fingerprint, baseline.fingerprint);

    write(projectRoot, 'src/index.ts', 'export const version = 1;\n');
    fs.renameSync(path.join(projectRoot, 'src/index.ts'), path.join(projectRoot, 'src/version.ts'));
    assert.notEqual(calculateProtocolSourceFingerprint(projectRoot).fingerprint, baseline.fingerprint);

    fs.renameSync(path.join(projectRoot, 'src/version.ts'), path.join(projectRoot, 'src/index.ts'));
    const markerPath = writeProtocolBuildFingerprint(projectRoot);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    assert.deepEqual(marker, calculateProtocolSourceFingerprint(projectRoot));
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
