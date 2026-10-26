const HOST_NAME = 'com.tuget.desktop';
const SESSION_ID = 'native-host-e2e-session';
const EXTENSION_ID = 'dojjjgfogfhepmnoejgaofgooohddlcm';

let port;
let sequence = 0;

function envelope(type, payload) {
  sequence += 1;
  return {
    version: 1,
    messageId: `native-host-e2e-${sequence}`,
    type,
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    payload,
  };
}

function sendHeartbeat() {
  if (!port) return;
  port.postMessage(envelope('HEARTBEAT', {
    sequence,
    activeTaskCount: 0,
  }));
}

function connect() {
  if (port) return;
  port = chrome.runtime.connectNative(HOST_NAME);
  port.onMessage.addListener((message) => {
    if (message?.type === 'HELLO_ACK') {
      port.postMessage(envelope('ENGINE_READY', { profileId: 'native-host-e2e' }));
    }
  });
  port.onDisconnect.addListener(() => {
    console.error('Native Host disconnected', chrome.runtime.lastError?.message);
    port = undefined;
    setTimeout(connect, 250);
  });
  port.postMessage(envelope('HELLO', {
    extensionId: EXTENSION_ID,
    extensionVersion: chrome.runtime.getManifest().version,
    supportedProtocolVersions: [1],
    capabilities: [],
  }));
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'START_NATIVE_HOST_E2E') connect();
});
setInterval(sendHeartbeat, 250);
