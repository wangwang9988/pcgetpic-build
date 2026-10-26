import api from './index'

/** 登录请求参数 */
export interface LoginParams {
  username: string
  password: string
}

/** 登录响应 */
export interface LoginResult {
  token: string
  expiresIn: number
}

/** 管理员登录 */
export function login(params: LoginParams) {
  return api.post<LoginResult>('/login', params)
}
