import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAPABILITIES,
  CAPTURE_CHANNELS,
  CLIENT_COMMAND_TYPES,
  DESKTOP_EXTENSION_ID,
  ENGINE_EVENT_TYPES,
  ERROR_CODES,
  getProtocolValidationErrors,
  isCaptureChannel,
  validateProtocolMessage,
} from '../src/index.js';
import protocolSchema from '../schema/protocol.schema.json' with { type: 'json' };

const taskTypes = new Set([
  'START_CAPTURE',
  'PAUSE_TASK',
  'RESUME_TASK',
  'CANCEL_TASK',
  'FOCUS_TASK_TAB',
  'RELOAD_TASK_TAB',
  'CLOSE_TASK_TAB',
  'ACK_BATCH',
  'DOWNLOAD_RESOURCE_IN_BROWSER',
  'TASK_STARTED',
  'TASK_PROGRESS',
  'RESOURCE_BATCH',
  'INTERACTION_REQUIRED',
  'INTERACTION_RESOLVED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'TASK_CANCELLED',
  'BROWSER_DOWNLOAD_STARTED',
  'BROWSER_DOWNLOAD_COMPLETED',
  'BROWSER_DOWNLOAD_FAILED',
]);

const resource = {
  resourceId: 'resource-1',
  channel: 'generic-media',
  sourceLine: 'cat-catch',
  pageUrl: 'https://example.com/',
  resourceType: 'image',
  category: 'main',
  url: 'https://example.com/image.jpg',
  requestContext: {
    refererMode: 'set',
    referer: 'https://example.com/',
    userAgentRequired: false,
    browserDownloadRequired: true,
  },
  previewCandidates: [{
    url: 'https://example.com/image.jpg',
    requestContext: {
      refererMode: 'set',
      referer: 'https://example.com/',
      userAgentRequired: false,
      browserDownloadRequired: false,
    },
    rejectTinyPlaceholder: true,
  }],
};

const payloads: Record<string, object> = {
  HELLO_ACK: { acceptedProtocolVersion: 1, clientVersion: '0.1.0', capabilities: [] },
  START_CAPTURE: {
    url: 'https://example.com/',
    channels: ['generic-media'],
    captureDepth: 'light',
    keepTabOpen: false,
    captureMode: 'batch',
    maxVisitSeconds: 120,
    reusePreopenedTab: true,
  },
  PAUSE_TASK: {},
  RESUME_TASK: {},
  CANCEL_TASK: {},
  FOCUS_TASK_TAB: {},
  RELOAD_TASK_TAB: {},
  CLOSE_TASK_TAB: {},
  GET_ENGINE_STATUS: {},
  ACK_BATCH: { batchId: 'batch-1' },
  DOWNLOAD_RESOURCE_IN_BROWSER: { resource },
  RESET_ENGINE_STATE: {},
  SHUTDOWN_ENGINE: {},
  HELLO: {
    extensionId: DESKTOP_EXTENSION_ID,
    extensionVersion: '0.1.0',
    supportedProtocolVersions: [1],
    capabilities: [],
  },
  ENGINE_READY: {},
  ENGINE_STATUS: { profileId: 'tuget-browser-default', tasks: [] },
  HEARTBEAT: { sequence: 1, activeTaskCount: 0 },
  TASK_STARTED: { url: 'https://example.com/' },
  TASK_PROGRESS: { phase: 'capturing', discoveredResourceCount: 0 },
  RESOURCE_BATCH: { batchId: 'batch-1', batchIndex: 0, isLastBatch: true, resources: [] },
  INTERACTION_REQUIRED: { kind: 'login', url: 'https://example.com/login' },
  INTERACTION_RESOLVED: {},
  TASK_COMPLETED: { resourceCount: 0, completedChannels: [], tabClosed: true },
  TASK_FAILED: { error: { code: 'CAPTURE_FAILED', message: 'failed', retryable: true } },
  TASK_CANCELLED: {},
  BROWSER_DOWNLOAD_STARTED: { resourceId: 'resource-1', downloadId: 1 },
  BROWSER_DOWNLOAD_COMPLETED: { resourceId: 'resource-1', downloadId: 1, filename: 'C:\\Downloads\\image.jpg' },
  BROWSER_DOWNLOAD_FAILED: {
    resourceId: 'resource-1',
    error: { code: 'CAPTURE_FAILED', message: 'download failed', retryable: true },
  },
  ENGINE_STATE_RESET: {
    requestMessageId: 'msg-reset',
    deletedTaskCount: 0,
    clearedStorageKeyCount: 0,
  },
  ENGINE_WARNING: { code: 'PROFILE_LOW_SPACE', message: 'low space' },
};

test('every declared message type has a schema-valid minimal message', () => {
  const types = [...CLIENT_COMMAND_TYPES, ...ENGINE_EVENT_TYPES];
  assert.deepEqual(Object.keys(payloads).sort(), [...types].sort());

  for (const type of types) {
    const message: Record<string, unknown> = {
      version: 1,
      messageId: `msg-${type.toLowerCase()}`,
      type,
      sessionId: 'session-1',
      timestamp: 1786464000000,
      payload: payloads[type],
    };
    if (taskTypes.has(type)) message.taskId = 'task-1';
    assert.equal(
      validateProtocolMessage(message),
      true,
      `${type}: ${JSON.stringify(getProtocolValidationErrors())}`,
    );
  }
});

test('runtime capability and error constants match the canonical schema', () => {
  const definitions = protocolSchema.$defs;
  assert.deepEqual(definitions.CaptureChannel.enum, [...CAPTURE_CHANNELS]);
  assert.equal(definitions.StartCapturePayload.properties.channels.maxItems, CAPTURE_CHANNELS.length);
  assert.equal(definitions.TaskStartedPayload.properties.pageTasks.maxItems, CAPTURE_CHANNELS.length);
  assert.equal(definitions.TaskProgressPayload.properties.completedChannels.maxItems, CAPTURE_CHANNELS.length);
  assert.equal(definitions.TaskCompletedPayload.properties.completedChannels.maxItems, CAPTURE_CHANNELS.length);
  assert.deepEqual(definitions.Capability.enum, [...CAPABILITIES]);
  assert.deepEqual(definitions.ErrorCode.enum, [...ERROR_CODES]);
});

test('capture-channel runtime guard follows the canonical channel registry', () => {
  for (const channel of CAPTURE_CHANNELS) assert.equal(isCaptureChannel(channel), true);
  assert.equal(isCaptureChannel('backup-two'), false);
  assert.equal(isCaptureChannel('unknown-line'), false);
});

test('resource preview candidates retain per-url request semantics', () => {
  const message = {
    version: 1,
    messageId: 'msg-resource-preview-context',
    type: 'RESOURCE_BATCH',
    sessionId: 'session-1',
    taskId: 'task-1',
    timestamp: 1786464000000,
    payload: {
      batchId: 'batch-1',
      batchIndex: 0,
      isLastBatch: true,
      resources: [resource],
    },
  };
  assert.equal(
    validateProtocolMessage(message),
    true,
    JSON.stringify(getProtocolValidationErrors()),
  );
});
