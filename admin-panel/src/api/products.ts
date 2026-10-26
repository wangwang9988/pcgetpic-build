import api from './index'

export interface ProductRecord {
  id: number
  code: string
  name: string
  kind: 'desktop' | 'extension'
  code_prefix: string
  order_prefix: string
  hmac_secret_env: string
  store_url: string
  support_email: string | null
  is_active: number
  sort_order: number
  created_at: number
  updated_at: number
}

export type ProductParams = Omit<ProductRecord, 'id' | 'created_at' | 'updated_at'>

export function getProducts() {
  return api.get<ProductRecord[]>('/products')
}

export function createProduct(params: ProductParams) {
  return api.post<{ id: number }>('/products', params)
}

export function updateProduct(code: string, params: Partial<ProductParams>) {
  return api.patch(`/products/${code}`, params)
}
