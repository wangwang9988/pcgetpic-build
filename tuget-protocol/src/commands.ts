import type { Capability } from './capabilities.js';
import type { CaptureScrollPolicy } from './captureScroll.js';
import type { CaptureChannel, CaptureMode, ResourceDto } from './dto.js';
import type { MessageEnvelope, TaskMessageEnvelope } from './envelope.js';

export const CLIENT_COMMAND_TYPES = [
  'HELLO_ACK',
  'START_CAPTURE',
  'PAUSE_TASK',
  'RESUME_TASK',
  'CANCEL_TASK',
  'FOCUS_TASK_TAB',
  'RELOAD_TASK_TAB',
  'CLOSE_TASK_TAB',
  'GET_ENGINE_STATUS',
  'ACK_BATCH',
  'DOWNLOAD_RESOURCE_IN_BROWSER',
  'RESET_ENGINE_STATE',
  'SHUTDOWN_ENGINE',
] as const;

export type HelloAckCommand = MessageEnvelope<'HELLO_ACK', {
  acceptedProtocolVersion: 1;
  clientVersion: string;
  capabilities: Capability[];
}>;

export type StartCaptureCommand = TaskMessageEnvelope<'START_CAPTURE', {
  url: string;
  channels: CaptureChannel[];
  captureDepth: 'light' | 'deep';
  keepTabOpen: boolean;
  /** 缺省值保持为 batch，以兼容旧版客户端。 */
  captureMode?: CaptureMode;
  /** 客户端创建的单页任务从开始导航到强制结束的最长时间。 */
  maxVisitSeconds?: number;
  scrollPolicy?: CaptureScrollPolicy;
  /** Chromium 冷启动时已用 url 打开首个标签页，扩展应接管而不是重复创建。 */
  reusePreopenedTab?: boolean;
}>;

export type PauseTaskCommand = TaskMessageEnvelope<'PAUSE_TASK', Record<string, never>>;
export type ResumeTaskCommand = TaskMessageEnvelope<'RESUME_TASK', Record<string, never>>;
export type CancelTaskCommand = TaskMessageEnvelope<'CANCEL_TASK', { reason?: string }>;
export type FocusTaskTabCommand = TaskMessageEnvelope<'FOCUS_TASK_TAB', Record<string, never>>;
export type ReloadTaskTabCommand = TaskMessageEnvelope<'RELOAD_TASK_TAB', Record<string, never>>;
export type CloseTaskTabCommand = TaskMessageEnvelope<'CLOSE_TASK_TAB', Record<string, never>>;
export type GetEngineStatusCommand = MessageEnvelope<'GET_ENGINE_STATUS', Record<string, never>>;
export type AckBatchCommand = TaskMessageEnvelope<'ACK_BATCH', { batchId: string }>;
export type DownloadResourceInBrowserCommand = TaskMessageEnvelope<'DOWNLOAD_RESOURCE_IN_BROWSER', {
  resource: ResourceDto;
}>;
export type ShutdownEngineCommand = MessageEnvelope<'SHUTDOWN_ENGINE', { reason?: string }>;
export type ResetEngineStateCommand = MessageEnvelope<'RESET_ENGINE_STATE', { reason?: string }>;

export type ClientCommand =
  | HelloAckCommand
  | StartCaptureCommand
  | PauseTaskCommand
  | ResumeTaskCommand
  | CancelTaskCommand
  | FocusTaskTabCommand
  | ReloadTaskTabCommand
  | CloseTaskTabCommand
  | GetEngineStatusCommand
  | AckBatchCommand
  | DownloadResourceInBrowserCommand
  | ResetEngineStateCommand
  | ShutdownEngineCommand;

export type ClientCommandType = (typeof CLIENT_COMMAND_TYPES)[number];
