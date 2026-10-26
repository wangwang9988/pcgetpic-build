export const ERROR_CODES = [
  'INVALID_MESSAGE',
  'UNSUPPORTED_PROTOCOL_VERSION',
  'UNSUPPORTED_COMMAND',
  'UNSUPPORTED_CAPABILITY',
  'INVALID_URL',
  'ENGINE_NOT_READY',
  'TASK_NOT_FOUND',
  'TASK_CONFLICT',
  'NAVIGATION_FAILED',
  'PAGE_LOAD_TIMEOUT',
  'CAPTURE_FAILED',
  'INTERACTION_REQUIRED',
  'NATIVE_HOST_DISCONNECTED',
  'CANCELLED',
  'INTERNAL_ERROR',
] as const;

export type ProtocolErrorCode = (typeof ERROR_CODES)[number];

export type ProtocolError = {
  code: ProtocolErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

