<template>
  <!-- EXE 下载引导模态框：引导用户从 Microsoft Store 在线安装（适配自 website/ExeDownloadGuideModal） -->
  <Teleport to="body">
    <Transition name="exe-guide">
      <div v-if="modelValue" class="exe-guide-modal" @click.self="close">
        <div class="exe-guide-content">
          <!-- 关闭按钮 -->
          <button class="close-btn" :aria-label="t('close')" @click="close">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z" />
            </svg>
          </button>

          <!-- 警告图标 -->
          <div class="guide-icon-wrapper">
            <svg viewBox="0 0 1024 1024" width="48" height="48">
              <path fill="#f59e0b" d="M543.2 96.8L951 800.8c11.7 20.3 11.7 45.3 0 65.5-5.9 10.2-14.8 18.4-25.6 23.4-8.2 3.8-17.1 5.8-26.1 5.7H124.7c-9 0.1-18-1.9-26.1-5.7-10.8-5-19.7-13.2-25.6-23.4-11.7-20.3-11.7-45.3 0-65.5L480.8 96.8c5.9-10.2 14.8-18.4 25.6-23.4 20.3-11.7 45.3-11.7 65.5 0 10.8 5 19.7 13.2 25.6 23.4z m-31.2 82.4L135.4 838.2h753.2L512 179.2zM512 704c-19.4 0-35.2-15.8-35.2-35.2 0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2c0 19.4-15.8 35.2-35.2 35.2z m-35.2-227.6c0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2v105.6c0 19.4-15.8 35.2-35.2 35.2s-35.2-15.8-35.2-35.2V476.4z" />
            </svg>
          </div>

          <!-- 标题 -->
          <h3 class="guide-title">{{ t('exeGuideTitle') }}</h3>

          <!-- 说明文字 -->
          <p class="guide-desc">{{ t('exeGuideDesc') }}</p>

          <!-- 对比卡片 -->
          <div class="compare-cards">
            <!-- Microsoft Store 方案（推荐） -->
            <div class="compare-card recommended">
              <div class="card-badge">{{ t('exeGuideRecommended') }}</div>
              <div class="card-header">
                <MicrosoftStoreMark :size="24" />
                <span class="card-title">Microsoft Store</span>
              </div>
              <ul class="card-features">
                <li>
                  <svg class="feature-check" viewBox="0 0 1024 1024" width="14" height="14">
                    <path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 150.5-209.9c6-8.3 15.7-13.3 25.9-13.3h46.9c6.5 0 10.3 7.4 6.5 12.7z" />
                  </svg>
                  {{ t('exeStoreVerified') }}
                </li>
                <li>
                  <svg class="feature-check" viewBox="0 0 1024 1024" width="14" height="14">
                    <path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 150.5-209.9c6-8.3 15.7-13.3 25.9-13.3h46.9c6.5 0 10.3 7.4 6.5 12.7z" />
                  </svg>
                  {{ t('exeStoreAutoUpdate') }}
                </li>
                <li>
                  <svg class="feature-check" viewBox="0 0 1024 1024" width="14" height="14">
                    <path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 150.5-209.9c6-8.3 15.7-13.3 25.9-13.3h46.9c6.5 0 10.3 7.4 6.5 12.7z" />
                  </svg>
                  {{ t('exeStoreMultiDevice') }}
                </li>
              </ul>
              <a
                :href="storeUrl"
                target="_blank"
                rel="noopener noreferrer"
                referrerpolicy="origin"
                class="btn btn-primary btn-store-cta"
                @click="handleStoreClick"
              >
                {{ t('exeStoreCta') }}
              </a>
            </div>

            <!-- EXE 下载方案 -->
            <div class="compare-card">
              <div class="card-badge-muted">{{ t('exeGuideFallback') }}</div>
              <div class="card-header">
                <svg class="card-icon-download" viewBox="0 0 24 24" width="22" height="22">
                  <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <span class="card-title">{{ t('exeGuideDirectTitle') }}</span>
              </div>
              <ul class="card-features muted">
                <li>
                  <svg class="feature-warn" viewBox="0 0 1024 1024" width="14" height="14">
                    <path fill="currentColor" d="M543.2 96.8L951 800.8c11.7 20.3 11.7 45.3 0 65.5-5.9 10.2-14.8 18.4-25.6 23.4-8.2 3.8-17.1 5.8-26.1 5.7H124.7c-9 0.1-18-1.9-26.1-5.7-10.8-5-19.7-13.2-25.6-23.4-11.7-20.3-11.7-45.3 0-65.5L480.8 96.8c5.9-10.2 14.8-18.4 25.6-23.4 20.3-11.7 45.3-11.7 65.5 0 10.8 5 19.7 13.2 25.6 23.4z m-31.2 82.4L135.4 838.2h753.2L512 179.2zM512 704c-19.4 0-35.2-15.8-35.2-35.2 0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2c0 19.4-15.8 35.2-35.2 35.2z m-35.2-227.6c0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2v105.6c0 19.4-15.8 35.2-35.2 35.2s-35.2-15.8-35.2-35.2V476.4z" />
                  </svg>
                  {{ t('exeDirectSecurity') }}
                </li>
                <li>
                  <svg class="feature-warn" viewBox="0 0 1024 1024" width="14" height="14">
                    <path fill="currentColor" d="M543.2 96.8L951 800.8c11.7 20.3 11.7 45.3 0 65.5-5.9 10.2-14.8 18.4-25.6 23.4-8.2 3.8-17.1 5.8-26.1 5.7H124.7c-9 0.1-18-1.9-26.1-5.7-10.8-5-19.7-13.2-25.6-23.4-11.7-20.3-11.7-45.3 0-65.5L480.8 96.8c5.9-10.2 14.8-18.4 25.6-23.4 20.3-11.7 45.3-11.7 65.5 0 10.8 5 19.7 13.2 25.6 23.4z m-31.2 82.4L135.4 838.2h753.2L512 179.2zM512 704c-19.4 0-35.2-15.8-35.2-35.2 0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2c0 19.4-15.8 35.2-35.2 35.2z m-35.2-227.6c0-19.4 15.8-35.2 35.2-35.2s35.2 15.8 35.2 35.2v105.6c0 19.4-15.8 35.2-35.2 35.2s-35.2-15.8-35.2-35.2V476.4z" />
                  </svg>
                  {{ t('exeDirectManualUpdate') }}
                </li>
              </ul>
              <button class="btn btn-secondary btn-exe-cta" @click="handleExeClick">
                {{ t('exeDirectCta') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import MicrosoftStoreMark from './MicrosoftStoreMark.vue'
import { t } from '@/i18n'

interface Props {
  modelValue: boolean
  storeUrl: string
}

defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'download-exe': []
}>()

const close = () => {
  emit('update:modelValue', false)
}

const handleStoreClick = () => {
  // 用户选择了 Microsoft Store，关闭模态框
  close()
}

const handleExeClick = () => {
  // 用户坚持要下载 EXE，交给父组件触发下载并关闭模态框
  emit('download-exe')
  close()
}
</script>

<style scoped>
/* 模态框遮罩 - 苹果风毛玻璃 */
.exe-guide-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.exe-guide-content {
  position: relative;
  max-width: 560px;
  width: 100%;
  padding: 40px 36px 32px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.06);
}

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
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-primary, #1f2937);
}

.guide-icon-wrapper {
  margin-bottom: 16px;
}

.guide-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 10px 0;
}

.guide-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 28px;
  max-width: 440px;
  margin-left: auto;
  margin-right: auto;
}

/* 对比卡片区域 */
.compare-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  text-align: left;
}

.compare-card {
  position: relative;
  padding: 20px 16px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.compare-card.recommended {
  border-color: rgba(0, 113, 227, 0.3);
  background: linear-gradient(180deg, rgba(0, 113, 227, 0.04) 0%, #ffffff 100%);
  box-shadow: 0 4px 16px rgba(0, 113, 227, 0.08);
}

.card-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 14px;
  border-radius: 999px;
  background: var(--color-primary, #0071e3);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.card-badge-muted {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 14px;
  border-radius: 999px;
  background: #9ca3af;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.card-icon-download {
  color: #6b7280;
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  width: 100%;
}

.card-features li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #374151;
  margin-bottom: 8px;
}

.card-features li:last-child {
  margin-bottom: 0;
}

.card-features.muted li {
  color: #6b7280;
}

.feature-check {
  color: #10b981;
  flex-shrink: 0;
  margin-top: 1px;
}

.feature-warn {
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 1px;
}

.btn-store-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  background: var(--color-primary, #0071e3);
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-store-cta:hover {
  background: #0062c4;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
  text-decoration: none;
}

.btn-exe-cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-exe-cta:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
}

/* 过渡动画 */
.exe-guide-enter-active,
.exe-guide-leave-active {
  transition: all 0.3s ease;
}

.exe-guide-enter-from,
.exe-guide-leave-to {
  opacity: 0;
}

.exe-guide-enter-from .exe-guide-content,
.exe-guide-leave-to .exe-guide-content {
  transform: scale(0.92) translateY(20px);
}

.exe-guide-enter-active .exe-guide-content,
.exe-guide-leave-active .exe-guide-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 响应式 */
@media (max-width: 560px) {
  .compare-cards {
    grid-template-columns: 1fr;
  }

  .exe-guide-content {
    padding: 36px 20px 24px;
  }

  .guide-title {
    font-size: 20px;
  }
}
</style>
