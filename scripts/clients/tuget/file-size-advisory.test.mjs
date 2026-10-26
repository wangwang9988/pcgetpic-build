import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  classifyLineCount,
  countLogicalLines,
  findScopeForPath,
  runReport,
  scanWorkspace,
} from './file-size-advisory.mjs';

test('uses strict 800/1000/1500 advisory thresholds', () => {
  assert.equal(classifyLineCount(800), null);
  assert.equal(classifyLineCount(801), 'notice');
  assert.equal(classifyLineCount(1000), 'notice');
  assert.equal(classifyLineCount(1001), 'warning');
  assert.equal(classifyLineCount(1500), 'warning');
  assert.equal(classifyLineCount(1501), 'critical');
  assert.equal(countLogicalLines('one\r\ntwo\r\n'), 2);
});

test('includes only the TuGet product-line collaboration boundaries', () => {
  assert.equal(findScopeForPath('browser/src/main.rs')?.name, 'browser');
  assert.equal(findScopeForPath('browser/tests/bridge.test.rs')?.name, 'browser');
  assert.equal(findScopeForPath('browser/extensions/pro-getpic/bundle.js'), null);
  assert.equal(
    findScopeForPath('Pro-GetPic/tuget-client-integration/bridge/bootstrap.ts')?.name,
    'Pro-GetPic client integration',
  );
  assert.equal(findScopeForPath('Pro-GetPic/pro-media/unrelated.ts'), null);
  assert.equal(
    findScopeForPath('Pro-GetPic/entrypoints/background.ts')?.name,
    'Pro-GetPic client integration',
  );
  assert.equal(findScopeForPath('TuGet-Client/src/assets/generated.ts'), null);
  assert.equal(findScopeForPath('tuget-native-host/src/pipe.rs')?.name, 'tuget-native-host');
  assert.equal(findScopeForPath('tuget-protocol/schema/protocol.schema.json')?.name, 'tuget-protocol');
});

test('reports critical files without returning a failure', () => {
  const root = mkdtempSync(join(tmpdir(), 'tuget-product-line-size-'));
  const originalLog = console.log;
  try {
    mkdirSync(join(root, 'browser', 'src'), { recursive: true });
    mkdirSync(join(root, 'browser', 'extensions'), { recursive: true });
    mkdirSync(join(root, 'Pro-GetPic', 'tuget-client-integration', 'bridge'), { recursive: true });
    mkdirSync(join(root, 'Pro-GetPic', 'pro-media'), { recursive: true });
    writeFileSync(join(root, 'browser', 'src', 'main.rs'), 'line\n'.repeat(1501));
    writeFileSync(join(root, 'browser', 'extensions', 'bundle.js'), 'line\n'.repeat(1600));
    writeFileSync(
      join(root, 'Pro-GetPic', 'tuget-client-integration', 'bridge', 'large.ts'),
      'line\n'.repeat(1001),
    );
    writeFileSync(join(root, 'Pro-GetPic', 'pro-media', 'large.ts'), 'line\n'.repeat(1600));

    const findings = scanWorkspace(root);
    assert.deepEqual(
      findings.map(({ level, projectPath }) => [level, projectPath]),
      [
        ['critical', 'browser/src/main.rs'],
        ['warning', 'Pro-GetPic/tuget-client-integration/bridge/large.ts'],
      ],
    );
    console.log = () => undefined;
    assert.equal(runReport(root), 0);
  } finally {
    console.log = originalLog;
    rmSync(root, { recursive: true, force: true });
  }
});
