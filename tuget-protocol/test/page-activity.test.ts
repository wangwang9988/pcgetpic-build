import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProtocolMessage, type PageActivitySnapshot } from '../src/index.js';

const activity: PageActivitySnapshot = {
  documentKey: 'doc-1', url: 'https://example.test/login', observedAt: 123,
  ready: true, scrollY: 0, scrollHeight: 2_000, viewportHeight: 800, userActive: false,
};
function event(pageActivity?: unknown) {
  return { version: 1, type: 'ENGINE_STATUS', messageId: 'status-1', sessionId: 'session-1', timestamp: 123,
    payload: { profileId: 'desktop', tasks: [{ taskId: 'owner', url: 'https://example.test/item',
      channel: 'generic-media', captureDepth: 'light', keepTabOpen: true, captureMode: 'batch',
      status: 'capturing', paused: false, tabId: 42, discoveredResourceCount: 0,
      deliveredResourceCount: 0, createdAt: 1, updatedAt: 123,
      ...(pageActivity ? { pageActivity } : {}) }] } };
}
test('page activity is optional for older engines and strict for new ones', () => {
  assert.equal(validateProtocolMessage(event()), true);
  assert.equal(validateProtocolMessage(event(activity)), true);
  for (const invalid of [{ scrollY: -1 }, { viewportHeight: 0 }, { url: 'file:///secret' },
    { userActive: 'false' }, { documentKey: '' }, { resourceUrls: ['https://example.test/image.jpg'] }]) {
    assert.equal(validateProtocolMessage(event({ ...activity, ...invalid })), false);
  }
});
