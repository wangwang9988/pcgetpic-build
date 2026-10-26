/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 代理目标地址（仅 vite.config.ts 使用，运行时不暴露） */
  readonly VITE_API_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
