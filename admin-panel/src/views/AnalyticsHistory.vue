<template>
  <div class="history-page">
    <div class="page-header">
      <div><h1>历史统计归档</h1><p>查询最近 90 天以前的数据。选择日期后点击查询，每次最多 366 天。</p></div>
      <n-button @click="router.back()">返回统计</n-button>
    </div>
    <n-card>
      <n-space align="center" wrap>
        <n-select v-model:value="source" :options="sources" style="width: 190px" :disabled="loading" />
        <n-date-picker v-model:formatted-value="dates" value-format="yyyy-MM-dd" type="daterange"
          :is-date-disabled="disabledDate" :disabled="loading || !cutoff" clearable />
        <n-button type="primary" :loading="loading" :disabled="!dates || !cutoff" @click="search">查询历史数据</n-button>
      </n-space>
      <p v-if="source === 'client'" class="hint">按当前所选产品查询；切换左侧产品可查看其他客户端。</p>
      <p v-if="cutoff" class="hint">可查询 {{ cutoff }} 以前的日期。近期数据请返回统计页面查看。</p>
    </n-card>
    <n-alert v-if="error" type="error" class="section">{{ error }}</n-alert>
    <template v-if="result">
      <p class="hint">{{ result.start }} 至 {{ result.end }} · {{ resultLabel }}</p>
      <n-grid :cols="hasDownloadMetric ? 4 : 3" :x-gap="16">
        <n-gi><n-card><n-statistic label="范围内去重用户 / 设备" :value="result.summary.users" /></n-card></n-gi>
        <n-gi><n-card><n-statistic label="统计记录" :value="result.summary.records" /></n-card></n-gi>
        <n-gi><n-card><n-statistic :label="eventsLabel" :value="result.summary.events" /></n-card></n-gi>
        <n-gi v-if="hasDownloadMetric"><n-card><n-statistic label="下载文件 / 次数" :value="result.summary.downloads" /></n-card></n-gi>
      </n-grid>
      <n-card title="每日历史统计" class="section">
        <n-data-table :columns="dailyColumns" :data="result.daily" :pagination="{ pageSize: 30 }" :row-key="dailyRowKey" />
      </n-card>
      <n-card v-for="(rows, dimension) in result.distributions" :key="dimension" :title="`${dimensionLabels[dimension] || dimension} TOP 20`" class="section">
        <n-data-table :columns="distributionColumns" :data="rows" :bordered="false" />
      </n-card>
    </template>
    <n-empty v-else-if="!loading && !error" class="section" description="选择统计类型和日期，再查询历史数据" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAnalyticsHistory, getHistoryOptions, type HistorySource, type HistoryResult } from '@/api/analyticsHistory'
import { useProductStore } from '@/stores/product'
const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const sources = [
  { label: '插件下载统计', value: 'downloads' }, { label: '新标签页统计', value: 'newtab' },
  { label: '搜索页统计', value: 'search' }, { label: '域名下载统计', value: 'domains' },
  { label: '插件卸载统计', value: 'uninstalls' }, { label: '客户端统计', value: 'client' },
]
const source = ref<HistorySource>(sources.some(s => s.value === route.query.source) ? route.query.source as HistorySource : 'downloads')
const dates = ref<[string, string] | null>(null)
const cutoff = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<HistoryResult | null>(null)
const resultLabel = computed(() => sources.find(s => s.value === result.value?.source)?.label || '')
const eventsLabel = computed(() => result.value?.source === 'domains' ? '下载次数' : result.value?.source === 'uninstalls' ? '卸载次数' : '上报事件')
const hasDownloadMetric = computed(() => result.value?.source === 'client' || result.value?.source === 'domains')
const dimensionLabels: Record<string, string> = { version: '版本', browser: '浏览器', os: '系统', os_type: '系统', language: '语言', site_domain: '域名', download_type: '下载类型', activation_status: '激活状态' }
const dailyColumns = computed(() => [
  { title: '日期', key: 'date' }, { title: '当日去重用户 / 设备', key: 'users' },
  { title: '记录数', key: 'records' }, { title: '事件数', key: 'events' },
  ...(hasDownloadMetric.value ? [{ title: '下载量', key: 'downloads' }] : []),
])
const distributionColumns = [{ title: '分类', key: 'value' }, { title: '去重用户 / 设备', key: 'users' }, { title: '记录数', key: 'records' }, { title: '事件数', key: 'events' }]
const dailyRowKey = (row: HistoryResult['daily'][number]) => row.date
function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const disabledDate = (timestamp: number) => !cutoff.value || localDate(new Date(timestamp)) >= cutoff.value
watch([source, dates], () => { result.value = null; error.value = '' })
async function search() {
  if (!dates.value || loading.value) return
  loading.value = true; error.value = ''; result.value = null
  try {
    const response = await getAnalyticsHistory({ source: source.value, start: dates.value[0], end: dates.value[1],
      product: source.value === 'client' ? productStore.activeProduct : undefined })
    result.value = response.data
  } catch (e: any) { error.value = e.response?.data?.message || e.message || '查询失败' }
  finally { loading.value = false }
}
onMounted(async () => {
  try {
    cutoff.value = (await getHistoryOptions()).data.cutoff
    const end = new Date(`${cutoff.value}T12:00:00`); end.setDate(end.getDate() - 1)
    const start = new Date(end); start.setDate(start.getDate() - 29)
    dates.value = [localDate(start), localDate(end)]
  } catch { error.value = '无法读取历史查询范围，请刷新页面重试' }
})
</script>

<style scoped>
.history-page { max-width: 1600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.page-header h1 { margin: 0 0 8px; }
.hint, .page-header p { color: rgba(255,255,255,.6); }
.section { margin-top: 20px; }
</style>
