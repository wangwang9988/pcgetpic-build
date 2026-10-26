import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const packageSpecifiers = [
  '@tuget/protocol',
  '@tuget/protocol/identity',
  '@tuget/protocol/channels',
  '@tuget/protocol/version',
  '@tuget/protocol/capture-scroll',
  '@tuget/protocol/browser-validator',
  '@tuget/protocol/schema',
];

test('package exports resolve for ESM and CommonJS config loaders', () => {
  for (const specifier of packageSpecifiers) {
    assert.doesNotThrow(
      () => import.meta.resolve(specifier),
      `${specifier} must resolve through the import condition`,
    );
    assert.doesNotThrow(
      () => require.resolve(specifier),
      `${specifier} must resolve through the require condition`,
    );
  }
});
