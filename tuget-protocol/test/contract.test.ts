import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  DESKTOP_EXTENSION_ID,
  DESKTOP_EXTENSION_MANIFEST_PUBLIC_KEY,
  DESKTOP_EXTENSION_PUBLIC_KEY_SHA256,
  getProtocolValidationErrors,
  validateProtocolMessage,
} from '../src/index.js';

const fixturesRoot = join(process.cwd(), 'test', 'fixtures');

function loadFixtures(kind: 'valid' | 'invalid'): unknown[] {
  const directory = join(fixturesRoot, kind);
  return readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(directory, file), 'utf8')) as unknown);
}

function deriveChromeExtensionId(publicKeyDer: Buffer): string {
  const digest = createHash('sha256').update(publicKeyDer).digest();
  const alphabet = 'abcdefghijklmnop';
  return [...digest.subarray(0, 16)]
    .flatMap((byte) => [alphabet[(byte >> 4) & 0x0f], alphabet[byte & 0x0f]])
    .join('');
}

test('desktop identity is reproducible from the manifest public key', () => {
  const publicKeyDer = Buffer.from(DESKTOP_EXTENSION_MANIFEST_PUBLIC_KEY, 'base64');
  const fingerprint = createHash('sha256').update(publicKeyDer).digest('hex').toUpperCase().match(/../g)?.join(':');
  assert.equal(deriveChromeExtensionId(publicKeyDer), DESKTOP_EXTENSION_ID);
  assert.equal(fingerprint, DESKTOP_EXTENSION_PUBLIC_KEY_SHA256);
});

test('all valid fixtures satisfy the v1 schema', () => {
  for (const fixture of loadFixtures('valid')) {
    assert.equal(validateProtocolMessage(fixture), true, JSON.stringify(getProtocolValidationErrors()));
  }
});

test('all invalid fixtures are rejected', () => {
  for (const fixture of loadFixtures('invalid')) {
    assert.equal(validateProtocolMessage(fixture), false);
    assert.ok(getProtocolValidationErrors().length > 0);
  }
});

test('unknown envelope fields are rejected', () => {
  const fixture = loadFixtures('valid')[0] as Record<string, unknown>;
  assert.equal(validateProtocolMessage({ ...fixture, shellCommand: 'whoami' }), false);
});

test('a page owner can register independent A/B/C task identities', () => {
  assert.equal(validateProtocolMessage({
    version: 1,
    messageId: 'engine-page-started-1',
    type: 'TASK_STARTED',
    sessionId: 'session-1',
    taskId: 'task-page-1',
    timestamp: 1,
    payload: {
      url: 'https://example.com/item',
      tabId: 42,
      pageTasks: [
        { taskId: 'task-page-1', channel: 'generic-media' },
        { taskId: 'browse-specialized-42-1', channel: 'specialized' },
        { taskId: 'browse-backup-one-42-1', channel: 'backup-one' },
      ],
    },
  }), true, JSON.stringify(getProtocolValidationErrors()));
});
