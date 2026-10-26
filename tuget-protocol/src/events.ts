import type { Capability } from './capabilities.js';
import type { CaptureChannel, CaptureMode, ResourceDto } from './dto.js';
import type { MessageEnvelope, TaskMessageEnvelope } from './envelope.js';
import type { ProtocolError } from './errors.js';

export const ENGINE_EVENT_TYPES = [
  'HELLO',
  'ENGINE_READY',
  'ENGINE_STATUS',
  'HEARTBEAT',
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
  'ENGINE_STATE_RESET',
  'ENGINE_WARNING',
] as const;

export type HelloEvent = MessageEnvelope<'HELLO', {
  extensionId: string;
  extensionVersion: string;
  supportedProtocolVersions: number[];
  browserVersion?: string;
  capabilities: Capability[];
}>;

export type EngineReadyEvent = MessageEnvelope<'ENGINE_READY', {
  profileId?: string;
}>;

/** Read-only page lifecycle evidence; never contains A/B/C resource data. */
export type PageActivitySnapshot = {
  documentKey: string;
  url: string;
  observedAt: number;
  ready: boolean;
  scrollY: number;
  scrollHeight: number;
  viewportHeight: number;
  userActive: boolean;
};

export type EngineTaskStatus = {
  taskId: string;
  /** 客户端网页任务的 taskId；缺省表示浏览器自由浏览产生的独立页面任务。 */
  parentTaskId?: string;
  url: string;
  channel: CaptureChannel;
  captureDepth: 'light' | 'deep';
  keepTabOpen: boolean;
  captureMode?: CaptureMode;
  status: 'queued' | 'navigating' | 'capturing' | 'publishing' | 'cancel-requested' | 'cancelled' | 'completed' | 'failed';
  paused: boolean;
  tabId?: number;
  discoveredResourceCount: number;
  deliveredResourceCount: number;
  /** Only desktop-owned batch tabs report this; absent means no early-close evidence. */
  pageActivity?: PageActivitySnapshot;
  createdAt: number;
  updatedAt: number;
  error?: string;
};

export type EngineStatusEvent = MessageEnvelope<'ENGINE_STATUS', {
  profileId: string;
  tasks: EngineTaskStatus[];
}>;

export type HeartbeatEvent = MessageEnvelope<'HEARTBEAT', {
  sequence: number;
  activeTaskCount: number;
}>;

export type TaskStartedEvent = TaskMessageEnvelope<'TASK_STARTED', {
  url: string;
  tabId?: number;
  /** 当前渠道子任务所属的客户端网页任务。 */
  parentTaskId?: string;
  /**
   * Browser Engine 完成同页三线接入后，在网页任务上发送的权威登记表。
   * 只列出 Pro-GetPic 判定适用于当前页面、且已经建立的渠道任务。
   */
  pageTasks?: Array<{
    taskId: string;
    channel: CaptureChannel;
  }>;
}>;

export type TaskProgressEvent = TaskMessageEnvelope<'TASK_PROGRESS', {
  phase: 'queued' | 'navigating' | 'capturing' | 'waiting-interaction' | 'publishing' | 'paused';
  activeChannel?: CaptureChannel;
  completedChannels?: CaptureChannel[];
  discoveredResourceCount: number;
  message?: string;
}>;

export type ResourceBatchEvent = TaskMessageEnvelope<'RESOURCE_BATCH', {
  batchId: string;
  batchIndex: number;
  isLastBatch: boolean;
  resources: ResourceDto[];
}>;

export type InteractionKind = 'login' | 'captcha' | 'consent' | 'navigation-blocked' | 'other';

export type InteractionRequiredEvent = TaskMessageEnvelope<'INTERACTION_REQUIRED', {
  kind: InteractionKind;
  url: string;
  tabId?: number;
  message?: string;
}>;

export type InteractionResolvedEvent = TaskMessageEnvelope<'INTERACTION_RESOLVED', {
  kind?: InteractionKind;
  url?: string;
}>;

export type TaskCompletedEvent = TaskMessageEnvelope<'TASK_COMPLETED', {
  resourceCount: number;
  completedChannels: CaptureChannel[];
  /** 任务结束前，Browser Engine 已经关闭客户端创建的来源标签页。 */
  tabClosed?: boolean;
}>;

export type TaskFailedEvent = TaskMessageEnvelope<'TASK_FAILED', {
  error: ProtocolError;
}>;

export type TaskCancelledEvent = TaskMessageEnvelope<'TASK_CANCELLED', {
  reason?: string;
  alreadyClosed?: boolean;
  source?: 'tab_closed_by_user' | 'client_watchdog' | 'system' | string;
}>;

export type BrowserDownloadStartedEvent = TaskMessageEnvelope<'BROWSER_DOWNLOAD_STARTED', {
  resourceId: string;
  downloadId: number;
}>;

export type BrowserDownloadCompletedEvent = TaskMessageEnvelope<'BROWSER_DOWNLOAD_COMPLETED', {
  resourceId: string;
  downloadId: number;
  filename: string;
  bytesReceived?: number;
}>;

export type BrowserDownloadFailedEvent = TaskMessageEnvelope<'BROWSER_DOWNLOAD_FAILED', {
  resourceId: string;
  downloadId?: number;
  error: ProtocolError;
}>;

export type EngineWarningEvent = MessageEnvelope<'ENGINE_WARNING', {
  code: string;
  message: string;
}>;

export type EngineStateResetEvent = MessageEnvelope<'ENGINE_STATE_RESET', {
  requestMessageId: string;
  deletedTaskCount: number;
  clearedStorageKeyCount: number;
}>;

export type EngineEvent =
  | HelloEvent
  | EngineReadyEvent
  | EngineStatusEvent
  | HeartbeatEvent
  | TaskStartedEvent
  | TaskProgressEvent
  | ResourceBatchEvent
  | InteractionRequiredEvent
  | InteractionResolvedEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | TaskCancelledEvent
  | BrowserDownloadStartedEvent
  | BrowserDownloadCompletedEvent
  | BrowserDownloadFailedEvent
  | EngineStateResetEvent
  | EngineWarningEvent;

export type EngineEventType = (typeof ENGINE_EVENT_TYPES)[number];
