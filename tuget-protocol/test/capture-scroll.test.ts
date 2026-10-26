import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeCaptureScrollPolicy, validateProtocolMessage } from '../src/index.js';

test('scroll limits are optional for older clients and strictly bounded when supplied', () => {
  const message = JSON.parse(readFileSync('test/fixtures/valid/start-capture.json', 'utf8'));
  assert.equal(validateProtocolMessage(message), true);
  for (const scrollPolicy of [{ maxScreens: 8, maxSeconds: 15 }, { maxScreens: 100, maxSeconds: 120 }]) {
    assert.equal(validateProtocolMessage({ ...message, payload: { ...message.payload, scrollPolicy } }), true);
  }
  for (const scrollPolicy of [{ maxScreens: 0, maxSeconds: 15 }, { maxScreens: 101, maxSeconds: 15 },
    { maxScreens: 1.5, maxSeconds: 15 }, { maxScreens: 8, maxSeconds: 121 }, { maxScreens: 8 }, { maxScreens: '8', maxSeconds: 15 }]) {
    assert.equal(validateProtocolMessage({ ...message, payload: { ...message.payload, scrollPolicy } }), false);
  }
});

test('stored settings normalize invalid values and default to eight screens or fifteen seconds', () => {
  assert.deepEqual(normalizeCaptureScrollPolicy(), { maxScreens: 8, maxSeconds: 15 });
  assert.deepEqual(normalizeCaptureScrollPolicy({ maxScreens: NaN, maxSeconds: Infinity }), { maxScreens: 8, maxSeconds: 15 });
  assert.deepEqual(normalizeCaptureScrollPolicy({ maxScreens: 1000, maxSeconds: -1 }), { maxScreens: 100, maxSeconds: 1 });
});
