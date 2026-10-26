import type { PROTOCOL_VERSION } from './version.js';

export type ProtocolVersion = typeof PROTOCOL_VERSION;

export type MessageEnvelope<Type extends string, Payload> = {
  version: ProtocolVersion;
  messageId: string;
  type: Type;
  sessionId: string;
  taskId?: string;
  timestamp: number;
  payload: Payload;
};

export type TaskMessageEnvelope<Type extends string, Payload> =
  MessageEnvelope<Type, Payload> & { taskId: string };

