<script setup lang="ts">
import { useThemeVars } from 'naive-ui'
import type { FeedbackHistory } from '@/api/feedbacks'

defineProps<{ history: FeedbackHistory | null; currentId: string; loading: boolean; disabled: boolean; error: string }>()
const emit = defineEmits<{ open: [id: string]; page: [page: number]; retry: [] }>()
const theme = useThemeVars()
const labels = { pending: '待回复', replied: '已回复', closed: '已办结' }
const time = (value: number | null) => value ? new Date(value).toLocaleString('zh-CN') : '—'
</script>

<template>
  <div class="feedback-history" :style="{ '--history-border': theme.borderColor, '--history-primary': theme.primaryColor, '--history-muted': theme.textColor3 }">
    <n-alert v-if="error" type="warning" :bordered="false">
      {{ error }} <n-button text :disabled="disabled || loading" @click="emit('retry')">重新加载</n-button>
    </n-alert>
    <n-spin :show="loading">
      <template v-if="history">
        <p class="history-summary">共 {{ history.total }} 条 · 待回复 {{ history.summary.pending }} 条 · {{ history.summary.device_count }} 台设备有反馈<br>最近反馈：{{ time(history.summary.latest_at) }}</p>
        <n-empty v-if="!history.total" description="暂无关联历史" />
        <ol v-else :key="history.page" class="history-list" aria-label="关联反馈时间线">
          <li v-for="item in history.items" :key="item.feedback_id" :class="{ current: item.feedback_id === currentId }" :aria-current="item.feedback_id === currentId ? 'true' : undefined">
            <div class="history-heading">
              <n-button text type="primary" class="history-title" :disabled="disabled || loading || item.feedback_id === currentId" @click="emit('open', item.feedback_id)">{{ item.title }}</n-button>
              <n-tag v-if="item.feedback_id === currentId" size="small" type="info">当前工单</n-tag>
              <n-tag size="small" :type="item.status === 'pending' ? 'warning' : item.status === 'replied' ? 'success' : 'default'">{{ labels[item.status] }}</n-tag>
            </div>
            <p class="history-meta">{{ time(item.created_at) }} · 版本 {{ item.client_version }} · <span :title="item.device_hash">设备 {{ item.device_hash.slice(0, 12) }}…</span></p>
            <p class="history-content">{{ item.content_summary }}<span v-if="item.content_summary.length >= 160">…</span></p>
            <p v-if="item.reply_summary" class="history-reply"><strong>客服回复：</strong>{{ item.reply_summary }}<span v-if="item.reply_summary.length >= 200">…</span></p>
          </li>
        </ol>
        <div v-if="history.total > history.page_size" class="history-pagination">
          <n-pagination :page="history.page" :page-size="history.page_size" :item-count="history.total" :page-slot="5" :disabled="disabled || loading" @update:page="emit('page', $event)" />
        </div>
      </template>
      <div v-else class="history-placeholder">{{ loading ? '正在加载历史反馈…' : '暂无历史数据' }}</div>
    </n-spin>
  </div>
</template>

<style scoped>
.history-summary, .history-meta { color: var(--history-muted); font-size: 12px; line-height: 1.7; }
.history-list { list-style: none; padding: 0 8px 0 0; margin: 12px 0; max-height: 420px; overflow-y: auto; }
.history-list li { border-left: 2px solid var(--history-border); padding: 0 0 18px 14px; margin-left: 3px; }
.history-list li.current { border-left-color: var(--history-primary); }
.history-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.history-title { white-space: normal; text-align: left; height: auto; overflow-wrap: anywhere; max-width: 100%; }
.history-title :deep(.n-button__content) { white-space: normal; }
.history-content, .history-reply { margin: 6px 0 0; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.history-reply { padding-left: 10px; border-left: 2px solid var(--history-border); }
.history-meta { margin: 6px 0; }.history-pagination { display: flex; justify-content: flex-end; }
.history-placeholder { padding: 24px 0; color: var(--history-muted); }
</style>
