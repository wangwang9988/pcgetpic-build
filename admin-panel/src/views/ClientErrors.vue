<template>
  <div class="client-errors-page">
    <div class="page-header">
      <div>
        <h1>客户端错误</h1>
        <p>读取图个吉利客户端自动上传的启动、连接与通信诊断日志</p>
      </div>
      <n-button :loading="loading" @click="refresh">刷新</n-button>
    </div>

    <n-alert v-if="activeProduct !== 'tuget'" type="info" :bordered="false" class="product-alert">
      当前仅接收图个吉利（TuGet）客户端错误。请将左侧顶部产品切换为“图个吉利”查看报告。
    </n-alert>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4" responsive="screen">
      <n-gi><n-card><n-statistic label="独立错误" :value="summary.unique_reports" /></n-card></n-gi>
      <n-gi><n-card><n-statistic label="累计发生" :value="summary.total_occurrences" /></n-card></n-gi>
      <n-gi><n-card><n-statistic label="24 小时上报的独立错误" :value="summary.reports_24h" /></n-card></n-gi>
      <n-gi><n-card><n-statistic label="24 小时上报次数" :value="summary.occurrences_24h" /></n-card></n-gi>
    </n-grid>

    <n-card title="错误报告" class="reports-card">
      <div class="filters">
        <n-select
          v-model:value="source"
          clearable
          placeholder="错误来源"
          :options="sourceOptions"
          @update:value="applyFilters"
        />
        <n-input v-model:value="version" clearable placeholder="客户端版本，如 1.2.6" @keyup.enter="applyFilters" />
        <n-input v-model:value="search" clearable placeholder="报告编号、错误内容或激活码" @keyup.enter="applyFilters" />
        <n-button @click="applyFilters">查询</n-button>
      </div>

      <n-data-table
        :columns="columns"
        :data="reports.items"
        :loading="loading"
        :pagination="false"
        :bordered="false"
        size="small"
        :scroll-x="1540"
      />
      <div class="pagination-row">
        <n-pagination
          v-model:page="page"
          :page-size="pageSize"
          :item-count="reports.total"
          :page-slot="7"
        />
      </div>
    </n-card>

    <n-drawer v-model:show="detailVisible" :width="760" placement="right">
      <n-drawer-content title="客户端错误详情" closable :native-scrollbar="false">
        <n-spin :show="detailLoading">
          <template v-if="detail">
            <n-descriptions bordered :column="2" label-placement="left" size="small">
              <n-descriptions-item label="产品">{{ productLabel(detail.product) }}</n-descriptions-item>
              <n-descriptions-item label="报告编号">{{ detail.report_id }}</n-descriptions-item>
              <n-descriptions-item label="错误来源">{{ sourceLabel(detail.error_source) }}</n-descriptions-item>
              <n-descriptions-item label="累计次数">{{ detail.occurrence_count }}</n-descriptions-item>
              <n-descriptions-item label="完整激活码" :span="2"><span class="activation-code">{{ detail.activation_code || '未关联授权' }}</span></n-descriptions-item>
              <n-descriptions-item label="授权期限">{{ detail.license_duration }}</n-descriptions-item>
              <n-descriptions-item label="套餐">{{ detail.package_name || '-' }}</n-descriptions-item>
              <n-descriptions-item label="到期时间" :span="2">{{ detail.duration_type === 4 ? '无到期日（永久授权）' : formatTime(detail.expires_at) }}</n-descriptions-item>
              <n-descriptions-item label="设备标识">{{ detail.device_hash }}</n-descriptions-item>
              <n-descriptions-item label="客户端版本">{{ detail.client_version }}</n-descriptions-item>
              <n-descriptions-item label="系统架构">{{ detail.architecture || '-' }}</n-descriptions-item>
              <n-descriptions-item label="操作系统" :span="2">{{ detail.os_name }} {{ detail.os_version }}</n-descriptions-item>
              <n-descriptions-item label="程序包" :span="2">{{ detail.package_family || '-' }}</n-descriptions-item>
              <n-descriptions-item label="首次收到">{{ formatTime(detail.first_seen_at) }}</n-descriptions-item>
              <n-descriptions-item label="最近收到">{{ formatTime(detail.last_seen_at) }}</n-descriptions-item>
            </n-descriptions>

            <div class="log-heading">
              <strong>完整诊断日志</strong>
              <n-button size="small" @click="copyDetail">{{ copied ? '已复制' : '复制日志' }}</n-button>
            </div>
            <template v-if="detail.diagnostic_history?.length">
              <n-select
                :value="detail.diagnostic_event_id"
                :options="diagnosticHistoryOptions"
                :disabled="detailLoading"
                aria-label="选择诊断日志快照"
                @update:value="selectDiagnosticSnapshot"
              />
              <p>保留首份与最近 19 份日志。以下按服务器接收时间排序，故障发生时间请查看日志正文。</p>
            </template>
            <pre class="diagnostic-log">{{ detail.diagnostic_text || detail.error_message }}</pre>
          </template>
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NEllipsis, NTag, useMessage, type DataTableColumns } from 'naive-ui'
import {
  getClientErrorDetail,
  getClientErrors,
  getClientErrorSummary,
  type ClientErrorDetail,
  type ClientErrorListItem,
  type ClientErrorListResponse,
  type ClientErrorSummary,
} from '@/api/clientErrors'
import { useProductStore } from '@/stores/product'
import { createLatestRequest } from '@/utils/latestRequest'

const message = useMessage()
const productStore = useProductStore()
const activeProduct = computed(() => productStore.activeProduct)
const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const detail = ref<ClientErrorDetail>()
const copied = ref(false)
const diagnosticHistoryOptions = computed(() => (detail.value?.diagnostic_history || []).map((item, index) => ({
  value: item.event_id,
  label: `${item.legacy_snapshot ? '升级时保留' : index === 0 ? '最近收到' : '历史日志'} · ${formatTime(item.received_at)} · ${item.event_id.slice(0, 8)}`,
})))
const page = ref(1)
const pageSize = 20
const source = ref<string | null>(null)
const version = ref('')
const route = useRoute()
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const reportRequests = createLatestRequest()
const detailRequests = createLatestRequest()

const summary = ref<ClientErrorSummary>({
  unique_reports: 0,
  total_occurrences: 0,
  reports_24h: 0,
  occurrences_24h: 0,
  latest_at: null,
})
const reports = ref<ClientErrorListResponse>({ total: 0, page: 1, page_size: pageSize, items: [] })

const sourceLabels: Record<string, string> = {
  browser_engine_startup: '浏览器启动',
  browser_communication: '浏览器通信',
  client_operation: '客户端操作',
  license: '授权',
  download: '下载',
}
const sourceOptions = Object.entries(sourceLabels).map(([value, label]) => ({ value, label }))

function sourceLabel(value: string): string {
  return sourceLabels[value] || value
}

function productLabel(value: string): string {
  return value === 'tuget' ? '图个吉利 / TuGet' : value
}

function formatTime(value: number | null): string {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-'
}

async function openDetail(row: ClientErrorListItem): Promise<void> {
  const current = detailRequests.begin()
  copied.value = false
  detailVisible.value = true
  detailLoading.value = true
  detail.value = undefined
  try {
    const response = await getClientErrorDetail(row.report_id)
    if (current()) detail.value = response.data
  } catch (error) {
    if (current()) message.error(error instanceof Error ? error.message : '错误详情加载失败')
  } finally {
    if (current()) detailLoading.value = false
  }
}

async function copyDetail(): Promise<void> {
  if (!detail.value) return
  try {
    await navigator.clipboard.writeText(detail.value.diagnostic_text || detail.value.error_message)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2_000)
  } catch {
    message.error('复制失败，请手动选择日志文本')
  }
}

async function selectDiagnosticSnapshot(eventId: string): Promise<void> {
  if (!detail.value) return
  const reportId = detail.value.report_id
  const current = detailRequests.begin()
  detailLoading.value = true
  copied.value = false
  try {
    const response = await getClientErrorDetail(reportId, eventId)
    if (current()) detail.value = response.data
  } catch (error) {
    if (current()) message.error(error instanceof Error ? error.message : '历史日志加载失败')
  } finally {
    if (current()) detailLoading.value = false
  }
}

const columns: DataTableColumns<ClientErrorListItem> = [
  {
    title: '最近收到', key: 'last_seen_at', width: 168,
    render: (row) => formatTime(row.last_seen_at),
  },
  {
    title: '来源', key: 'error_source', width: 120,
    render: (row) => h(NTag, { size: 'small', type: row.error_source.includes('browser') ? 'error' : 'warning' }, { default: () => sourceLabel(row.error_source) }),
  },
  { title: '版本', key: 'client_version', width: 82 },
  { title: '完整激活码', key: 'activation_code', width: 260,
    render: (row) => h('span', { class: 'activation-code' }, row.activation_code || '未关联授权') },
  { title: '授权期限', key: 'license_duration', width: 160 },
  {
    title: '系统', key: 'os_version', width: 180,
    render: (row) => `${row.os_name} ${row.os_version}`.trim(),
  },
  {
    title: '错误摘要', key: 'error_summary', minWidth: 330,
    render: (row) => h(NEllipsis, { lineClamp: 2, tooltip: true }, { default: () => row.error_summary }),
  },
  { title: '次数', key: 'occurrence_count', width: 66 },
  {
    title: '操作', key: 'actions', width: 80, fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
  },
]

function fetchReports() {
  return getClientErrors({
    page: page.value,
    page_size: pageSize,
    source: source.value || undefined,
    version: version.value.trim() || undefined,
    search: search.value.trim() || undefined,
  })
}

async function refresh(): Promise<void> {
  const current = reportRequests.begin()
  loading.value = true
  try {
    const [summaryResponse, reportsResponse] = await Promise.all([
      getClientErrorSummary(),
      fetchReports(),
    ])
    if (current()) {
      summary.value = summaryResponse.data
      reports.value = reportsResponse.data
    }
  } catch (error) {
    if (current()) message.error(error instanceof Error ? error.message : '客户端错误加载失败')
  } finally {
    if (current()) loading.value = false
  }
}

function applyFilters(): void {
  if (page.value === 1) void refresh()
  else page.value = 1
}

watch(page, () => { void refresh() })
watch(detailVisible, (visible) => { if (!visible) detailRequests.invalidate() })
onMounted(() => { void refresh() })
onUnmounted(() => { reportRequests.invalidate(); detailRequests.invalidate() })
</script>

<style scoped>
.client-errors-page { display: flex; flex-direction: column; gap: 18px; }
.page-header { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; }
.page-header h1 { margin: 0 0 6px; font-size: 24px; }
.page-header p { margin: 0; color: var(--n-text-color-3); }
.product-alert { margin-bottom: -2px; }
.reports-card { margin-top: 2px; }
.filters { display: grid; grid-template-columns: 180px 180px minmax(260px, 1fr) auto; gap: 10px; margin-bottom: 16px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.log-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 8px; }
:deep(.activation-code) { font-family: ui-monospace, Consolas, monospace; overflow-wrap: anywhere; user-select: text; }
.diagnostic-log {
  min-height: 280px; max-height: calc(100vh - 390px); margin: 0; padding: 14px; overflow: auto;
  border: 1px solid rgba(255,255,255,.12); border-radius: 8px; font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap; overflow-wrap: anywhere; background: rgba(0,0,0,.22);
}
@media (max-width: 900px) {
  .filters { grid-template-columns: 1fr; }
}
</style>
