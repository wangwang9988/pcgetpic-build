<template>
  <!-- EXE 下载引导模态框：引导用户优先从 Microsoft Store 获取，同时保留独立 EXE 兜底 -->
  <Teleport to="body">
    <Transition name="exe-guide">
      <div
        v-if="modelValue"
        class="exe-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exe-guide-title"
        @click.self="close"
      >
        <div class="exe-guide-content">
          <!-- 关闭按钮 -->
          <button
            type="button"
            class="close-btn"
            :aria-label="t('exeModal.closeAria')"
            @click="close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <!-- 顶部提示图标 -->
          <div class="guide-icon-wrapper">
            <svg class="guide-icon" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <!-- 标题与说明 -->
          <h3 id="exe-guide-title" class="guide-title">{{ t('exeModal.title') }}</h3>
          <p class="guide-desc">
            {{ t('exeModal.desc') }}
          </p>

          <!-- 双通道对比卡片 -->
          <div class="compare-cards">
            <!-- 方案 A：Microsoft Store 官方渠道（推荐） -->
            <div class="compare-card recommended">
              <div class="card-badge">{{ t('exeModal.recBadge') }}</div>
              <div class="card-header">
                <MicrosoftStoreMark :size="22" />
                <span class="card-title">{{ t('exeModal.recTitle') }}</span>
              </div>
              <ul class="card-features">
                <li>
                  <svg class="feature-icon check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{{ t('exeModal.recFeat1') }}</span>
                </li>
                <li>
                  <svg class="feature-icon check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{{ t('exeModal.recFeat2') }}</span>
                </li>
                <li>
                  <svg class="feature-icon check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{{ t('exeModal.recFeat3') }}</span>
                </li>
              </ul>
              <a
                :href="resolvedStoreUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-modal-cta btn-store"
                @click="handleStoreClick"
              >
                {{ t('exeModal.recBtn') }}
              </a>
            </div>

            <!-- 方案 B：独立 EXE 安装包（备用） -->
            <div class="compare-card fallback">
              <div class="card-badge-muted">{{ t('exeModal.fbBadge') }}</div>
              <div class="card-header">
                <svg class="card-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span class="card-title">{{ t('exeModal.fbTitle') }}</span>
              </div>
              <ul class="card-features muted">
                <li>
                  <svg class="feature-icon warn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{{ t('exeModal.fbFeat1') }}</span>
                </li>
                <li>
                  <svg class="feature-icon warn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{{ t('exeModal.fbFeat2') }}</span>
                </li>
                <li>
                  <svg class="feature-icon warn" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{{ t('exeModal.fbFeat3') }}</span>
                </li>
              </ul>
              <button
                type="button"
                class="btn-modal-cta btn-exe"
                @click="handleExeClick"
              >
                {{ t('exeModal.fbBtn') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import MicrosoftStoreMark from './MicrosoftStoreMark.vue'
import { useProductInstallLinks } from '~/composables/useProductInstallLinks'

const { t } = useI18n()

interface Props {
  modelValue: boolean
  storeUrl?: string
  exeUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  storeUrl: '',
  exeUrl: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'download-exe': []
}>()

const {
  microsoftStoreUrl: defaultStoreUrl,
  exeDownloadUrl: defaultExeUrl,
  trackStoreClick,
  trackExeClick,
} = useProductInstallLinks()

const resolvedStoreUrl = computed(() => props.storeUrl || defaultStoreUrl.value)
const resolvedExeUrl = computed(() => props.exeUrl || defaultExeUrl.value)

const close = () => {
  emit('update:modelValue', false)
}

const handleStoreClick = () => {
  trackStoreClick('modal_guide_recommend')
  close()
}

const handleExeClick = () => {
  trackExeClick('modal_guide_confirm')
  emit('download-exe')

  // 如果有明确的下载地址，自动触发下载
  if (resolvedExeUrl.value && typeof window !== 'undefined') {
    const link = document.createElement('a')
    link.href = resolvedExeUrl.value
    link.download = 'TuGet-Setup.exe'
    link.referrerPolicy = 'origin-when-cross-origin'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  close()
}

// 键盘 ESC 关闭支持
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

// 弹窗打开时锁定背景滚动
watch(
  () => props.modelValue,
  (val) => {
    if (typeof document === 'undefined') return
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
/* 模态框全屏遮罩 - 苹果风高斯模糊 */
.exe-guide-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  box-sizing: border-box;
}

.exe-guide-content {
  position: relative;
  max-width: 620px;
  width: 100%;
  padding: 36px 32px 32px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 25px 60px -12px rgba(15, 23, 42, 0.25), 0 10px 20px -5px rgba(15, 23, 42, 0.08);
  box-sizing: border-box;
}

/* 关闭按钮 */
.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.05);
  color: var(--text-muted, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(15, 23, 42, 0.1);
  color: var(--text-primary, #0f172a);
}

/* 顶部警告图标 */
.guide-icon-wrapper {
  margin-bottom: 14px;
  display: flex;
  justify-content: center;
}

.guide-icon {
  color: #f59e0b;
}

/* 标题与描述 */
.guide-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  margin: 0 0 10px 0;
  letter-spacing: -0.01em;
}

.guide-desc {
  font-size: 0.9rem;
  color: var(--text-secondary, #475569);
  line-height: 1.6;
  margin: 0 auto 26px;
  max-width: 520px;
}

/* 对比卡片网格 */
.compare-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  text-align: left;
}

.compare-card {
  position: relative;
  padding: 24px 18px 20px;
  border: 1px solid var(--border-light, #e2e8f0);
  border-radius: 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

/* 推荐卡片 */
.compare-card.recommended {
  border-color: rgba(0, 120, 212, 0.35);
  background: linear-gradient(180deg, rgba(0, 120, 212, 0.04) 0%, #ffffff 100%);
  box-shadow: 0 4px 18px rgba(0, 120, 212, 0.08);
}

.card-badge {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 12px;
  border-radius: 9999px;
  background: #0078d4;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.card-badge-muted {
  position: absolute;
  top: -11px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 12px;
  border-radius: 9999px;
  background: #94a3b8;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.card-header-icon {
  color: #64748b;
  flex-shrink: 0;
}

/* 列表特性条目 */
.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-features li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-secondary, #334155);
}

.card-features.muted li {
  color: #64748b;
}

.feature-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.feature-icon.check {
  color: #10b981;
}

.feature-icon.warn {
  color: #f59e0b;
}

/* CTA 按钮 */
.btn-modal-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.btn-store {
  background: #0078d4;
  color: #ffffff;
  border: 1px solid #0078d4;
  box-shadow: 0 3px 10px rgba(0, 120, 212, 0.25);
}

.btn-store:hover {
  background: #006cc1;
  border-color: #006cc1;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(0, 120, 212, 0.35);
  color: #ffffff;
}

.btn-exe {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-exe:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #0f172a;
}

/* 动效 */
.exe-guide-enter-active,
.exe-guide-leave-active {
  transition: opacity 0.25s ease;
}

.exe-guide-enter-from,
.exe-guide-leave-to {
  opacity: 0;
}

.exe-guide-enter-from .exe-guide-content,
.exe-guide-leave-to .exe-guide-content {
  transform: scale(0.94) translateY(14px);
}

.exe-guide-enter-active .exe-guide-content,
.exe-guide-leave-active .exe-guide-content {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 响应式适配 */
@media (max-width: 620px) {
  .compare-cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .exe-guide-content {
    padding: 30px 20px 24px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .guide-title {
    font-size: 1.2rem;
  }
}
</style>
