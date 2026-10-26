import api from './index'

/** 套餐时长类型（与服务端 DURATION_TYPE 对齐，0=自定义） */
export enum PackageDurationType {
  /** 自定义（管理员手动输入天数） */
  Custom = 0,
  /** 3天高级体验 */
  Trial = 1,
  /** 1个月 */
  Monthly = 2,
  /** 1年 */
  Yearly = 3,
  /** 永久 */
  Permanent = 4,
}

/** 套餐记录（字段名与服务端数据库列名一致） */
export interface PackageRecord {
  id: number
  product: string
  name: string
  duration_type: PackageDurationType | number
  duration_days: number
  price: number
  original_price: number | null
  /** 港币售价；null 或 0 表示该套餐不开放 Stripe 收款 */
  price_hkd?: number | null
  /** 英文套餐名；留空时服务端按时长派生 */
  name_en?: string | null
  /** 收银台卡片角标（中文）；留空按收银台默认规则展示 */
  badge?: string | null
  /** 收银台卡片角标（英文）；留空按收银台默认规则展示 */
  badge_en?: string | null
  /** 自定义卖点（中文，每行一条）；留空按收银台默认权益展示 */
  features?: string[] | null
  /** 自定义卖点（英文，每行一条）；留空按收银台默认权益展示 */
  features_en?: string[] | null
  max_devices: number
  is_active: number
  sort_order: number
  created_at: string
  /** 关联激活码数量（仅列表接口返回） */
  code_count?: number
}

/** 创建/更新套餐参数（字段名与服务端接口对齐） */
export interface PackageParams {
  product: string
  name: string
  duration_type: PackageDurationType | number
  duration_days: number
  price: number
  original_price?: number | null
  /** 港币售价；传 null 或 0 关闭该套餐的 Stripe 收款 */
  price_hkd?: number | null
  /** 英文套餐名；传空字符串由服务端按时长派生 */
  name_en?: string | null
  /** 推荐角标（中文）；传 null 或空字符串恢复收银台默认角标 */
  badge?: string | null
  /** 推荐角标（英文）；传 null 或空字符串恢复收银台默认角标 */
  badge_en?: string | null
  /** 自定义卖点（中文，每行一条）；传 null 或空数组恢复默认权益 */
  features?: string[] | null
  /** 自定义卖点（英文，每行一条）；传 null 或空数组恢复默认权益 */
  features_en?: string[] | null
  max_devices: number
  is_active: number
  sort_order?: number
}

/** 获取套餐列表 */
export function getPackages() {
  return api.get<PackageRecord[]>('/packages')
}

/** 创建套餐 */
export function createPackage(params: PackageParams) {
  return api.post<PackageRecord>('/packages', params)
}

/** 更新套餐 */
export function updatePackage(id: number, params: PackageParams) {
  return api.patch<PackageRecord>(`/packages/${id}`, params)
}

/** 删除套餐 */
export function deletePackage(id: number) {
  return api.delete(`/packages/${id}`)
}
