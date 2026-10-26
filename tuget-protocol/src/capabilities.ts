/**
 * 扩展能力声明。
 *
 * 前三条对应 A/B/C 三条采集线的能力标识：
 *   'capture.specialized'   → A 线（专项采集线）
 *   'capture.generic-media' → B 线（通用媒体线）
 *   'capture.backup-one'    → C 线（备用提取1线）
 * 未来能力保留名（当前尚未加入 CAPABILITIES）：
 *   'capture.backup-two'   → D 线（备用提取2线）
 *   'capture.backup-three' → E 线（备用提取3线）
 * 后续按 F、G… 顺延，不得重新编排已有 A/B/C 线。
 */
export const CAPABILITIES = [
  'capture.specialized',    // A 线
  'capture.generic-media',  // B 线
  'capture.backup-one',     // C 线
  'task.cancel',
  'task.pause',
  'task.focus-tab',
  'interaction.login',
  'interaction.captcha',
  'resource.batch-ack',
  'resource.browser-download-fallback',
] as const;

export type Capability = (typeof CAPABILITIES)[number];
