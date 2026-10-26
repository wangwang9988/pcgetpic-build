import api from './index'

/** 密钥状态 */
export type KeyStatus = 'active' | 'grace' | 'retired'

/** 密钥记录 */
export interface KeyRecord {
  id: number
  version: number
  algorithm: string
  fingerprint: string
  public_key: string
  status: KeyStatus
  created_at: string
}

/** 获取密钥列表 */
export function getKeys() {
  return api.get<KeyRecord[]>('/keys')
}

/** 生成新密钥对 */
export function generateKey() {
  return api.post<KeyRecord>('/keys/generate')
}
