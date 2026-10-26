export * from './capabilities.js';
export * from './captureScroll.js';
export * from './commands.js';
export * from './dto.js';
export * from './envelope.js';
export * from './errors.js';
export * from './events.js';
export * from './identity.js';
export * from './version.js';
export * from './validator.js';

import type { ClientCommand } from './commands.js';
import type { EngineEvent } from './events.js';

export type ProtocolMessage = ClientCommand | EngineEvent;
