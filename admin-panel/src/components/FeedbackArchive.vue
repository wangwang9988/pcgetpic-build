<script setup lang="ts">
import { computed, h, onUnmounted, ref, watch } from 'vue'
import { NButton, NTag, type DataTableColumns } from 'naive-ui'
import { getFeedbacks, type Feedback, type FeedbackArchiveTarget, type FeedbackList } from '@/api/feedbacks'
import { useProductStore } from '@/stores/product'
import { createLatestRequest } from '@/utils/latestRequest'

const props = defineProps<{ show: boolean; target: FeedbackArchiveTarget | null; blocked: boolean }>()
const emit = defineEmits<{ 'update:show': [show: boolean]; open: [id: string]; filter: [target: FeedbackArchiveTarget] }>()
const store = useProductStore(), requests = createLatestRequest()
const data = ref<FeedbackList | null>(null), loading = ref(false), error = ref('')
let disposed = false
const title = computed(() => props.target?.kind === 'license' ? '授权工单归档' : '设备工单归档')
const productName = computed(() => store.products.find(product => product.code === props.target?.product)?.name || props.target?.product)
const labels = { pending: '待回复', replied: '已回复', closed: '已办结' }
const time = (value: number) => new Date(value).toLocaleString('zh-CN')

async function load(page = 1): Promise<void> {
  if (!props.show || !props.target || disposed) return
  const current = requests.begin(), target = props.target
  loading.value = true; error.value = ''
  try {
    // Query the identity itself, rather than relying on an anchor ticket that
    // may be deleted while its archive is open. No main-list filters are shared.
    const response = await getFeedbacks({ product: target.product, page,
      device_hash: target.kind === 'device' ? target.value : undefined,
      activation_code: target.kind === 'license' ? target.value : undefined })
    if (!current()) return
    const lastPage = Math.max(1, Math.ceil(response.data.total / response.data.page_size))
    if (page > lastPage) { await load(lastPage); return }
    data.value = response.data
  } catch (problem) {
    if (current()) {
      const e = problem as { response?: { data?: { message?: string } }; message?: string }
      error.value = e.response?.data?.message || e.message || '归档加载失败，请重试'
    }
  } finally { if (current()) loading.value = false }
}

const columns: DataTableColumns<Feedback> = [
  { title: '标题', key: 'title', minWidth: 200, render: row => h(NButton,
    { text: true, type: 'primary', class: 'archive-title', disabled: props.blocked || loading.value, onClick: () => emit('open', row.feedback_id) },
    { default: () => row.title }) },
  { title: '设备', key: 'device_hash', width: 140, render: row => h('span', { title: row.device_hash }, `${row.device_hash.slice(0, 12)}…`) },
  { title: '版本', key: 'client_version', width: 100, ellipsis: { tooltip: true } },
  { title: '提交时间', key: 'created_at', width: 175, render: row => time(row.created_at) },
  { title: '状态', key: 'status', width: 90, render: row => h(NTag,
    { size: 'small', type: row.status === 'pending' ? 'warning' : row.status === 'replied' ? 'success' : 'default' },
    { default: () => labels[row.status] }) },
  { title: '最近回复', key: 'reply_content', minWidth: 180, ellipsis: { tooltip: true }, render: row => row.reply_content || '尚未回复' },
  { title: '操作', key: 'actions', width: 100, fixed: 'right', render: row => h(NButton,
    { size: 'small', disabled: props.blocked || loading.value, onClick: () => emit('open', row.feedback_id) },
    { default: () => '查看处理' }) },
]

watch(() => [props.show, props.target] as const, ([show, target], previous) => {
  if (!show) { requests.invalidate(); loading.value = false; return }
  if (!target) return
  if (target !== previous?.[1]) data.value = null
  void load(data.value?.page ?? 1)
}, { immediate: true })
// Returning from the detail drawer refreshes replies, statuses and deletions
// without losing the archive page. Closed archives ignore late responses.
watch(() => props.blocked, (blocked, wasBlocked) => {
  if (wasBlocked && !blocked && props.show) void load(data.value?.page ?? 1)
})
onUnmounted(() => { disposed = true; requests.invalidate() })
</script>

<template>
  <n-modal :show="show" preset="card" :title="title" class="feedback-archive-modal" style="width: min(1100px, calc(100vw - 32px))" :closable="!blocked" :mask-closable="!blocked" :close-on-esc="!blocked" :auto-focus="!blocked" @update:show="emit('update:show', $event)">
    <template v-if="target">
      <div class="archive-identity"><n-tag size="small">{{ productName }}</n-tag><span>{{ target.value }}</span></div>
      <div class="archive-toolbar">
        <p>共 {{ data?.total ?? '—' }} 条工单，包含全部状态和版本。关闭工单详情后可继续查看本归档。</p>
        <n-button size="small" :loading="loading" :disabled="blocked" @click="load(data?.page ?? 1)">刷新归档</n-button>
      </div>
      <n-alert v-if="error" type="warning" :bordered="false" class="archive-error">{{ error }}</n-alert>
      <n-data-table :columns="columns" :data="data?.items ?? []" :loading="loading" :pagination="false" :scroll-x="985" :max-height="420" :row-key="(row: Feedback) => row.feedback_id" size="small" />
      <div class="archive-footer">
        <n-button size="small" :disabled="blocked" @click="emit('filter', target)">在主列表中筛选</n-button>
        <n-pagination v-if="data && data.total > data.page_size" :page="data.page" :page-size="data.page_size" :item-count="data.total" :page-slot="5" :disabled="blocked || loading" @update:page="load" />
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.archive-identity { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.archive-identity > span { overflow-wrap: anywhere; }
.archive-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; }
.archive-toolbar p { margin: 0; font-size: 13px; line-height: 1.7; opacity: .7; }
.archive-toolbar > button { flex-shrink: 0; }.archive-error { margin-bottom: 12px; }
.archive-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
:deep(.archive-title) { height: auto; max-width: 100%; text-align: left; }
:deep(.archive-title .n-button__content) { white-space: normal; overflow-wrap: anywhere; }
</style>
