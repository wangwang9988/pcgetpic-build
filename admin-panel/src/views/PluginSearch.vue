<template>
  <div class="plugin-search-page">
    <div class="page-header">
      <div>
        <h1>搜索页统计</h1>
        <p>统计插件 search.html 每天被多少匿名用户打开</p>
      </div>
      <n-space align="center">
        <n-space align="center" size="small" class="metric-note-toggle">
          <span>显示指标说明</span>
          <n-switch v-model:value="showMetricNotes" size="small" />
        </n-space>
        <n-radio-group v-model:value="range" button-style="solid" size="small" class="range-control">
          <n-radio-button
            v-for="option in rangeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </n-radio-button>
        </n-radio-group>
        <AnalyticsHistoryButton source="search" />
        <n-button :loading="loading" :disabled="loading" @click="fetchAnalytics(true)">刷新</n-button>
      </n-space>
    </div>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:4" responsive="screen">
      <n-gi>
        <n-card>
          <n-statistic label="今日打开用户" :value="summary.today_users" />
          <div v-show="showMetricNotes" class="metric-note">今日打开搜索页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日新增打开用户" :value="summary.today_new_users" />
          <div v-show="showMetricNotes" class="metric-note">今天首次打开搜索页的用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日新增打开用户" :value="summary.yesterday_new_users" />
          <div v-show="showMetricNotes" class="metric-note">昨天首次打开搜索页的用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日打开用户" :value="summary.yesterday_users" />
          <div v-show="showMetricNotes" class="metric-note">昨日打开搜索页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 7 日打开用户" :value="summary.last7_users" />
          <div v-show="showMetricNotes" class="metric-note">近 7 天打开搜索页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 30 日打开用户" :value="summary.last30_users" />
          <div v-show="showMetricNotes" class="metric-note">近 30 天打开搜索页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计打开用户" :value="summary.total_users" />
          <div v-show="showMetricNotes" class="metric-note">历史所有打开过搜索页的去重用户数</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="12" responsive="screen" class="content-grid">
      <n-gi :span="12">
        <n-card :title="`${rangeLabel}搜索页打开用户趋势`">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>显示数值</span>
              <n-switch v-model:value="showChartLabels" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="dailyOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi :span="12">
        <n-card title="每日明细">
          <n-data-table
            :columns="columns"
            :data="dailyReversed"
            :bordered="false"
            :single-line="false"
            size="small"
          />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import AnalyticsHistoryButton from '@/components/AnalyticsHistoryButton.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useMessage, type DataTableColumns } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import {
  getPluginSearchDaily,
  getPluginSearchSummary,
  type PluginSearchSummary,
  type SearchDailyAnalytics,
} from '@/api/pluginSearch'
import type { AnalyticsRange } from '@/api/analyticsRange'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
])

const message = useMessage()
const loading = ref(false)
const range = ref<AnalyticsRange>('30d')
const rangeOptions: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
]

const summary = ref<PluginSearchSummary>({
  today_users: 0,
  today_new_users: 0,
  yesterday_new_users: 0,
  yesterday_users: 0,
  last7_users: 0,
  last30_users: 0,
  total_users: 0,
})
const daily = ref<SearchDailyAnalytics[]>([])
const dailyReversed = computed(() => [...daily.value].reverse())
const showChartLabels = ref(false)
const showMetricNotes = ref(false)

const baseTextStyle = {
  color: 'rgba(255, 255, 255, 0.82)',
  fontFamily: 'inherit',
}

const numberFormatter = new Intl.NumberFormat('en-US')

type TooltipParam = {
  axisValueLabel?: string
  marker?: string
  seriesName?: string
  value?: unknown
}

function formatNumber(value: unknown): string {
  const number = Number(value)
  return Number.isFinite(number) ? numberFormatter.format(number) : String(value ?? '-')
}

function formatAxisTooltip(params: unknown): string {
  const items = Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam]
  const title = items[0]?.axisValueLabel ?? ''
  const rows = items.map((item) => {
    return `${item.marker ?? ''}${item.seriesName ?? ''}: ${formatNumber(item.value)} 人`
  })

  return [title, ...rows].filter(Boolean).join('<br/>')
}

function createLineLabel(dataLength: number) {
  const step = dataLength > 31 ? Math.ceil(dataLength / 31) : 1

  return {
    show: showChartLabels.value,
    position: 'top' as const,
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 11,
    distance: 6,
    formatter: (params: unknown) => {
      const dataIndex = (params as { dataIndex?: number }).dataIndex ?? 0
      if (step > 1 && dataIndex !== dataLength - 1 && dataIndex % step !== 0) return ''
      return formatNumber((params as { value?: unknown }).value)
    },
  }
}

const rangeLabel = computed(() => rangeOptions.find((option) => option.value === range.value)?.label ?? '')

const dailyOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: formatAxisTooltip,
  },
  legend: {
    data: ['打开用户', '每日新增打开用户'],
    selected: {
      打开用户: false,
      每日新增打开用户: true,
    },
    textStyle: baseTextStyle,
    top: 8,
    itemGap: 20,
  },
  grid: { left: 48, right: 24, top: 56, bottom: 36, containLabel: true },
  xAxis: {
    type: 'category',
    data: daily.value.map((item) => item.date.slice(5)),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: {
    type: 'value',
    name: '用户数 (人)',
    minInterval: 1,
    alignTicks: true,
    nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
  },
  series: [
    {
      name: '打开用户',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.user_count),
      itemStyle: { color: '#54bc4a' },
      areaStyle: { color: 'rgba(84, 188, 74, 0.12)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '每日新增打开用户',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.new_user_count),
      itemStyle: { color: '#f5a623' },
      areaStyle: { color: 'rgba(245, 166, 35, 0.10)' },
      label: createLineLabel(daily.value.length),
    },
  ],
}))

const columns = computed<DataTableColumns<SearchDailyAnalytics>>(() => [
  {
    title: '日期',
    key: 'date',
  },
  {
    title: '打开用户',
    key: 'user_count',
    sorter: (a, b) => a.user_count - b.user_count,
    render: (row) => formatNumber(row.user_count),
  },
  {
    title: '新增打开用户',
    key: 'new_user_count',
    sorter: (a, b) => a.new_user_count - b.new_user_count,
    render: (row) => formatNumber(row.new_user_count),
  },
])

let latestRequestId = 0

async function fetchAnalytics(forceFresh = false) {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const [summaryRes, dailyRes] = await Promise.all([
      getPluginSearchSummary(forceFresh),
      getPluginSearchDaily(range.value, forceFresh),
    ])

    if (requestId !== latestRequestId) return
    summary.value = summaryRes.data ?? summary.value
    daily.value = dailyRes.data ?? []
  } catch (error) {
    if (requestId === latestRequestId) {
      console.error('[PluginSearch] fetch failed:', error)
      message.error('获取搜索页统计失败')
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

async function fetchRangeData() {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const dailyRes = await getPluginSearchDaily(range.value)
    if (requestId !== latestRequestId) return
    daily.value = dailyRes.data ?? []
  } catch (error) {
    if (requestId === latestRequestId) {
      console.error('[PluginSearch] range fetch failed:', error)
      message.error('获取搜索页统计失败')
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

watch(range, fetchRangeData)

onMounted(fetchAnalytics)
</script>

<style scoped>
.plugin-search-page {
  min-width: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 24px;
  line-height: 1.2;
}

.page-header p {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 14px;
}

.range-control :deep(.n-radio-button) {
  min-width: 56px;
  text-align: center;
}

.range-control :deep(.n-radio-button--checked) {
  background-color: rgba(16, 185, 129, 0.15) !important;
  border-color: #10b981 !important;
  box-shadow: -1px 0 0 0 #10b981 !important;
}

.range-control :deep(.n-radio-button--checked),
.range-control :deep(.n-radio-button--checked *) {
  color: #ffffff !important;
}

.metric-note-toggle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  white-space: nowrap;
}

.chart-label-toggle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  white-space: nowrap;
}

.metric-note {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  line-height: 1.4;
}

.content-grid {
  margin-top: 16px;
}

.chart {
  width: 100%;
  height: 360px;
}

@media (max-width: 767px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart {
    height: 280px;
  }
}
</style>
