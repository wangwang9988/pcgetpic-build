import api from './index'

/** 激活码状态枚举 */
export enum CodeStatus {
  /** 未使用 */
  Unused = 0,
  /** 已激活 */
  Activated = 1,
  /** 已禁用 */
  Disabled = 2,
}

export type CodeStatusAction = 'enable' | 'disable'

/** 激活码记录 */
export interface CodeRecord {
  id: number
  product: string
  code: string
  package_id: number
  package_name: string
  channel_id: number
  channel_name: string
  status: CodeStatus
  /** 时长类型：1=体验，2=月度，3=年度，4=永久 */
  duration_type: number
  /** 授权有效天数 */
  duration_days: number
  device_count: number
  /** 最大可激活设备数（从套餐继承） */
  max_devices: number
  batch_note: string
  manual_note?: string
  created_at: string
  /** 激活时间（毫秒级时间戳），未激活时为 null */
  activated_at: number | null
  /** 到期时间（毫秒级时间戳），永久或未激活时为 null */
  expires_at?: number | null
  /** 是否已过期：0=未过期，1=已过期 */
  is_expired?: number
}

/** 激活码分页列表参数 */
export interface CodeListParams {
  page?: number
  pageSize?: number
  status?: CodeStatus | ''
  keyword?: string
}

/** 分页响应 */
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 批量生成参数 */
export interface GenerateCodesParams {
  package_id: number
  channel_id: number
  count: number
  max_devices?: number
  batch_note: string
}

/** 批量生成结果 */
export interface GenerateCodesResult {
  codes: string[]
  count: number
}

/** 获取激活码分页列表 */
export function getCodes(params: CodeListParams) {
  return api.get<PaginatedResult<CodeRecord>>('/codes', { params })
}

/** 批量生成激活码 */
export function generateCodes(params: GenerateCodesParams) {
  return api.post<GenerateCodesResult>('/codes/generate', params)
}

/** 更新激活码状态 */
export function updateCodeStatus(id: number, action: CodeStatusAction) {
  return api.patch<{ status: CodeStatus }>(`/codes/${id}/status`, { action })
}

/** 修改激活码人工备注 */
export function updateCodeNote(id: number, note: string) {
  return api.patch<{ id: number; manual_note: string }>(`/codes/${id}/note`, { note })
}

/** 导出激活码 CSV */
export function exportCodes(status?: CodeStatus | '', keyword?: string) {
  const params: Record<string, string | number> = {}
  if (status !== '' && status !== undefined) params.status = status
  if (keyword && keyword.trim()) params.keyword = keyword.trim()
  return api.get('/codes/export', {
    params,
    responseType: 'blob',
  })
}

/** 设备绑定记录 */
export interface DeviceRecord {
  id: number
  code_id: number
  device_fingerprint: string
  hostname: string | null
  os_type: string | null
  client_version: string
  first_seen_at: number
  last_check_at: number | null
}

/** 获取激活码绑定的设备列表 */
export function getCodeDevices(id: number) {
  return api.get<DeviceRecord[]>(`/codes/${id}/devices`)
}
