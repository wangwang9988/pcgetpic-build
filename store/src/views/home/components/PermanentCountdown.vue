<template>
  <div class="permanent-countdown" :class="{ 'permanent-countdown--urgent': isUrgent }">
    <span class="countdown-icon" aria-hidden="true">⏰</span>
    <span class="countdown-label">{{ t('permanentCountdownLabel') }}</span>
    <span class="countdown-time">{{ formattedTime }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * 永久卡限时倒计时展示组件
 *
 * 纯展示组件，倒计时逻辑由 useDailyCountdown composable 提供。
 * 父组件传入格式化后的时间和紧急状态即可。
 */
import { t } from '@/i18n'

defineProps<{
  /** 格式化后的倒计时文本（HH:MM:SS） */
  formattedTime: string
  /** 是否进入紧急状态（≤1小时），触发红色闪烁 */
  isUrgent: boolean
}>()
</script>

<style scoped>
.permanent-countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  margin-bottom: 16px;
  background: rgba(255, 149, 0, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 149, 0, 0.25);
  font-size: 13px;
  font-weight: 600;
  color: #FF6B00;
}

.countdown-icon {
  font-size: 14px;
}

.countdown-time {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: 1px;
}

/* 紧急状态：红色 + 闪烁 */
.permanent-countdown--urgent {
  background: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: #FF3B30;
  animation: countdown-blink 1s ease-in-out infinite;
}

@keyframes countdown-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
