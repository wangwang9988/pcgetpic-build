<template>
  <div class="state-success animate-fade-in-up">
    <div class="success-container glass-card">
      <!-- 成功图标 -->
      <div class="success-icon animate-scale-in">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" style="fill: var(--color-success); fill-opacity: 0.15; stroke: var(--color-success);" stroke-width="3" />
          <path d="M26 40 L36 50 L54 32" style="stroke: var(--color-success);" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <h2 class="success-title">{{ t('successTitle') }}</h2>

      <!-- 激活码 -->
      <div class="activation-code-area">
        <p class="code-label">{{ t('activationCode') }}</p>
        <div class="code-display">
          <span class="code-text">{{ activationCode }}</span>
        </div>
      </div>

      <!-- 邮箱提示 -->
      <p class="email-tip">
        {{ t('successSubtitle') }} <strong>{{ email }}</strong>
      </p>

      <!-- 激活步骤 -->
      <div class="activation-steps">
        <h3 class="steps-title">{{ t('activationStepsTitle') }}</h3>
        <div class="step-list">
                    <div class="step-item">
            <span class="step-number">1</span>
            <span class="step-text">{{ t('activationStep1') }}</span>
          </div>
          <div class="step-item">
            <span class="step-number">2</span>
            <span class="step-text">{{ t('activationStep2') }}</span>
          </div>
          <div class="step-item">
            <span class="step-number">3</span>
            <span class="step-text">{{ t('activationStep3') }}</span>
          </div>
          <div class="step-item">
            <span class="step-number">4</span>
            <span class="step-text">{{ t('activationStep4') }}</span>
          </div>
        </div>

        <!-- 客户端下载入口 -->
        <div class="success-download">
          <p class="success-download-hint">{{ t('notInstalled') }}</p>
          <div class="success-download-btns">
            <a
              :href="MICROSOFT_STORE_URL"
              target="_blank"
              rel="noopener"
              referrerpolicy="origin"
              class="success-dl-btn success-dl-btn--store"
            >
              <MicrosoftStoreMark :size="16" />
              {{ t('installFromStore') }}
            </a>
            <div class="success-fallback-channel">
              <span class="fallback-tip">{{ t('exeFallbackTitle') }}</span>
              <button
                type="button"
                class="fallback-btn"
                @click="showExeGuide = true"
              >
                {{ t('exeDownloadLink') }}
              </button>
              <a
                :href="CLIENT_DOWNLOAD_URL"
                class="sr-only"
                referrerpolicy="origin-when-cross-origin"
              >{{ t('exeFallbackDesc') }}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- EXE 下载引导弹窗：引导用户在线安装 -->
      <ExeDownloadGuideModal
        v-model="showExeGuide"
        :store-url="MICROSOFT_STORE_URL"
        @download-exe="handleExeDownload"
      />

      <!-- 操作按钮 -->
      <div class="success-actions">
        <div class="action-buttons-row">
          <n-button type="primary" size="large" class="copy-code-btn" @click="handleCopyCode">
            <template #icon>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </template>
            {{ t('copyCode') }}
          </n-button>
        </div>
        <n-button text class="back-link" @click="emit('back-home')">
          {{ t('backHome') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'
import { useMessage, NButton } from 'naive-ui'
import { CLIENT_DOWNLOAD_URL, MICROSOFT_STORE_URL } from '@/config'
import MicrosoftStoreMark from './MicrosoftStoreMark.vue'
import { t } from '@/i18n'

const ExeDownloadGuideModal = defineAsyncComponent(() => import('./ExeDownloadGuideModal.vue'))

const props = defineProps<{
  activationCode: string
  email: string
}>()

const emit = defineEmits<{
  (e: 'back-home'): void
}>()

const message = useMessage()

// ========== EXE 下载引导 ==========
const showExeGuide = ref(false)

/** 用户确认仍要下载 EXE */
function handleExeDownload() {
  window.open(CLIENT_DOWNLOAD_URL, '_blank', 'noopener')
}

async function handleCopyCode() {
  try {
    await navigator.clipboard.writeText(props.activationCode)
    message.success(t('codeCopied'))
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.activationCode
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    message.success(t('codeCopied'))
  }
}
</script>

<style scoped>
/* ========== 状态 4：支付成功 ========== */
.state-success {
  display: flex;
  justify-content: center;
  padding-top: 40px;
}

.success-container {
  width: 100%;
  max-width: 520px;
  padding: 48px 36px;
  text-align: center;
}

.success-icon { margin-bottom: 20px; }

.success-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 24px;
}

.activation-code-area { margin-bottom: 16px; }

.code-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.code-display {
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 16px 20px;
  display: inline-block;
}

.code-text {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 2px;
  word-break: break-all;
}

.email-tip {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.email-tip strong { color: var(--text-primary); }

.activation-steps {
  text-align: left;
  background: var(--bg-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 28px;
}

.steps-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-number {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--color-success-bg);
  color: var(--color-success);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-text { font-size: 14px; color: var(--text-muted); }

/* ========== 客户端下载入口 ========== */
.success-download {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
}

.success-download-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.success-download-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.success-dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s ease;
}

.success-dl-icon {
  flex-shrink: 0;
}

.success-dl-btn--store {
  background: #0071e3;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.2);
}

.success-dl-btn--store:hover {
  background: #0062c4;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.success-fallback-channel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  white-space: nowrap;
}

.fallback-tip {
  color: var(--text-secondary);
}

.fallback-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.fallback-btn:hover {
  color: var(--color-primary);
}

.success-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.action-buttons-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  width: 100%;
}

.back-link {
  color: var(--text-secondary) !important;
  font-size: 14px;
}

.back-link:hover { color: var(--color-primary) !important; }

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-scale-in {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
