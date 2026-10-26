import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import { engineEventValidationError, engineTaskValidationError, protocolSchemaFingerprint } from '../src/browserValidator.js';
import { validateProtocolMessage } from '../src/validator.js';

const base = { version: 1, messageId: 'event-test', sessionId: 'session-test', timestamp: 1 };
const url = (length: number) => {
  const prefix = 'https://example.test/?secret=';
  return prefix + 'x'.repeat(length - prefix.length);
};

test('compiled browser validation agrees with the protocol at the URL boundary', () => {
  for (const length of [32768, 32769]) {
    const value = 'https://' + 'x'.repeat(length - 8);
    const message = { ...base, type: 'TASK_STARTED', taskId: 'task-test', payload: { url: value, tabId: 42 } };
    assert.equal(engineEventValidationError(message) === undefined, length === 32768);
    assert.equal(engineEventValidationError(message) === undefined, validateProtocolMessage(message));
  }
});

test('rejection describes constraints without URLs, headers or payload values', () => {
  const result = engineEventValidationError({ ...base, type: 'TASK_STARTED', taskId: 'task-test',
    payload: { url: url(40_000) },
  });
  assert.match(result!, /path=\/payload\/url keyword=maxLength limit=32768 actual_length=40000/);
  assert.doesNotMatch(result!, /example|secret|xxxx/);
  assert.match(protocolSchemaFingerprint, /^[a-f0-9]{64}$/);
  assert.match(engineEventValidationError({ ...base, type: 'UNKNOWN' })!, /\/type/);
  assert.match(engineTaskValidationError({ taskId: 'task-test' })!, /required/);
});

test('compiled validation executes with dynamic code generation disabled (MV3 CSP)', () => {
  const file = new URL('../src/compiledValidators.cjs', import.meta.url);
  const context = vm.createContext({ exports: {}, require: createRequire(import.meta.url) }, {
    codeGeneration: { strings: false, wasm: false },
  });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  assert.equal(context.exports.TASK_STARTED({ ...base, type: 'TASK_STARTED', taskId: 'task-test',
    payload: { url: 'https://example.test/' },
  }), true);
});
