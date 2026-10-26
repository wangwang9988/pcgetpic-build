import type { CodeRecord } from '@/api/codes'

export const DURATION_TYPE_PERMANENT = 4
export const DAY_MS = 24 * 60 * 60 * 1000

/** 格式化时间戳为可读时间 */
export function formatTimestamp(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const date = new Date(typeof ts === 'number' ? ts : Number(ts))
  if (isNaN(date.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 计算激活码到期时间 */
export function getCodeExpiresAt(row: CodeRecord): number | null {
  if (typeof row.expires_at === 'number') return row.expires_at
  if (row.duration_type === DURATION_TYPE_PERMANENT || !row.activated_at || !row.duration_days) return null
  return Number(row.activated_at) + Number(row.duration_days) * DAY_MS
}

/** 判断激活码是否已过期 */
export function isCodeExpired(row: CodeRecord): boolean {
  if (typeof row.is_expired === 'number') return row.is_expired === 1
  const expiresAt = getCodeExpiresAt(row)
  return expiresAt !== null && Date.now() > expiresAt
}

/** 兼容性复制文本到剪贴板 */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy failed')
}
