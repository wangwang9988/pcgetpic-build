/**
 * 产品名称映射与格式化工具
 */

export const PRODUCT_NAME_MAP: Record<string, string> = {
  dangtu: '当图/DownPictures',
  tuget: '图个吉利/TuGet',
}

/**
 * 格式化产品展示名称
 * - dangtu -> 当图/DownPictures
 * - tuget -> 图个吉利/TuGet
 * - 其他自定义产品 -> 优先拼接名称，若无则返回 code
 */
export function formatProductName(code?: string | null, fallbackName?: string | null): string {
  if (!code) return '-'
  if (PRODUCT_NAME_MAP[code]) return PRODUCT_NAME_MAP[code]
  if (fallbackName) return `${fallbackName}/${code}`
  return code
}
