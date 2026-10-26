import api from './index'

/** 渠道记录 */
export interface ChannelRecord {
  id: number
  name: string
  code: string
  created_at: string
}

/** 创建/更新渠道参数 */
export interface ChannelParams {
  name: string
  code: string
}

/** 获取渠道列表 */
export function getChannels() {
  return api.get<ChannelRecord[]>('/channels')
}

/** 创建渠道 */
export function createChannel(params: ChannelParams) {
  return api.post<ChannelRecord>('/channels', params)
}

/** 更新渠道 */
export function updateChannel(id: number, params: ChannelParams) {
  return api.put<ChannelRecord>(`/channels/${id}`, params)
}

/** 删除渠道 */
export function deleteChannel(id: number) {
  return api.delete(`/channels/${id}`)
}
