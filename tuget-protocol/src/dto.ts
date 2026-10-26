/**
 * 采集渠道标识符。
 *
 * 对应 Pro-GetPic 扩展中当前正式运行的三条独立提取线（A/B/C 线路命名约定）：
 *   'specialized'   → A 线（专项采集线）→ pages.html       → commerce-capture/
 *   'generic-media' → B 线（通用媒体线）→ media.html       → pro-media/
 *   'backup-one'    → C 线（备用提取1线）→ backup-one.html  → pro-image-assistant/
 * 未来保留名（尚未加入协议枚举）：
 *   'backup-two'   → D 线（备用提取2线）→ backup-two.html
 *   'backup-three' → E 线（备用提取3线）→ backup-three.html
 *   后续按 F、G… 顺延，不得重新编排已有 A/B/C 线。
 * 沟通时说“A 线有问题”，即指 'specialized' 和 pages.html 对应的整条链路。
 */
export const CAPTURE_CHANNELS = [
  'specialized',    // A 线
  'generic-media',  // B 线
  'backup-one',     // C 线
] as const;

export type CaptureChannel = (typeof CAPTURE_CHANNELS)[number];

/**
 * CaptureChannel 的唯一运行时判定。各消费者不得复制当前渠道字符串清单，
 * 否则协议新增 D/E 线后容易出现某一层静默丢弃新渠道的版本漂移。
 */
export function isCaptureChannel(value: unknown): value is CaptureChannel {
  return typeof value === 'string'
    && (CAPTURE_CHANNELS as readonly string[]).includes(value);
}

/**
 * 客户端采集运行方式。
 *
 * single 会持续监听来源标签页，直到用户关闭页面或导航离开；batch 会在
 * 页面进入稳定期后结束任务，并允许客户端按队列策略关闭标签页。
 */
export type CaptureMode = 'single' | 'batch';

export const RESOURCE_TYPES = [
  'image',
  'video',
  'audio',
  'stream',
  'subtitle',
  'other',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_CATEGORIES = [
  'main',
  'sku',
  'detail',
  'review',
  'video',
  'audio',
  'stream',
  'subtitle',
  'other',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const REFERER_MODES = ['set', 'remove', 'none'] as const;
export type RefererMode = (typeof REFERER_MODES)[number];

export type ResourceRequestContext = {
  /**
   * `set` replays `referer`, `remove` explicitly suppresses it, and `none`
   * means that the owning capture line has no Referer opinion.  The optional
   * field keeps protocol-v1 payloads backward compatible.
   */
  refererMode?: RefererMode;
  referer?: string;
  origin?: string;
  headers?: Record<string, string>;
  userAgentRequired: boolean;
  browserDownloadRequired: boolean;
};

/**
 * Ordered display candidates produced by the owning capture line.  Each URL
 * carries its own request context so a thumbnail on another CDN never reuses
 * the primary resource's headers.
 */
export type ResourcePreviewCandidate = {
  url: string;
  requestContext: ResourceRequestContext;
  /** The owning line has identified tiny GIFs as anti-hotlink placeholders. */
  rejectTinyPlaceholder?: boolean;
};

export type ResourceDto = {
  resourceId: string;
  originalResourceId?: string;
  channel: CaptureChannel;
  sourceLine: string;
  /**
   * 跨端稳定的资源识别语义。`sourceLine` 仅用于诊断具体实现来源，客户端
   * 不应再依赖某个插件内部实现名来决定自动保存范围。
   */
  recognitionKind?: 'site-rule';
  pageUrl: string;
  pageTitle?: string;
  productTitle?: string;
  productId?: string;
  resourceType: ResourceType;
  category: ResourceCategory;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  extension?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  durationMs?: number;
  bitrate?: number;
  suggestedFilename?: string;
  requestContext: ResourceRequestContext;
  previewCandidates?: ResourcePreviewCandidate[];
};
