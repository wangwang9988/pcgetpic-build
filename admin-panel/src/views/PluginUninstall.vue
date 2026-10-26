<template>
  <div class="plugin-uninstall-page">
    <div class="page-header">
      <div>
        <h1>插件卸载统计</h1>
        <p>追踪 GetPic 卸载趋势、版本分布和用户使用时长</p>
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
        <AnalyticsHistoryButton source="uninstalls" />
        <n-button :loading="loading" :disabled="loading" @click="fetchAll(true)">刷新</n-button>
      </n-space>
    </div>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:8" responsive="screen">
      <n-gi>
        <n-card>
          <n-statistic label="今日卸载" :value="summary.today_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">按卸载上报日期统计</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日卸载" :value="summary.yesterday_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">按卸载上报日期统计</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 7 日卸载" :value="summary.last7d_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">含今天，按上报日期统计</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 30 日卸载" :value="summary.last30d_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">含今天，按上报日期统计</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计卸载" :value="summary.total_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">历史所有卸载记录数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="7 日卸载率" :value="summary.uninstall_rate_7d" suffix="%" />
          <div v-show="showMetricNotes" class="metric-note">近 7 天卸载数 ÷ (卸载 + 活跃) 用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="30 日卸载率" :value="summary.uninstall_rate_30d" suffix="%" />
          <div v-show="showMetricNotes" class="metric-note">近 30 天卸载数 ÷ (卸载 + 活跃) 用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="平均使用天数" :value="summary.avg_install_days" suffix=" 天" />
          <div v-show="showMetricNotes" class="metric-note">卸载前平均安装天数，仅统计有天数记录</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="12" responsive="screen" class="chart-grid">
      <n-gi :span="12">
        <n-card :title="`${rangeLabel}卸载趋势`">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>显示数值</span>
              <n-switch v-model:value="showChartLabels" size="small" />
            </n-space>
          </template>
          <v-chart class="chart large-chart" :option="dailyOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi span="12 m:6">
        <n-card title="版本卸载分布">
          <template #header-extra>
            <n-space align="center" size="small">
              <n-space align="center" size="small" class="chart-label-toggle">
                <span>百分比</span>
                <n-switch v-model:value="showPercent" size="small" />
              </n-space>
              <n-radio-group
                v-model:value="versionMode"
                size="small"
                button-style="solid"
                class="version-mode-control"
              >
                <n-radio-button
                  v-for="option in versionModeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </n-radio-button>
              </n-radio-group>
            </n-space>
          </template>
          <v-chart class="chart" :option="versionOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="浏览器卸载分布">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>百分比</span>
              <n-switch v-model:value="showPercent" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="browserOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi span="12 m:6">
        <n-card title="操作系统分布">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>百分比</span>
              <n-switch v-model:value="showPercent" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="osOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="卸载前使用时长">
          <v-chart class="chart" :option="retentionOption" autoresize />
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="最近 90 天卸载记录" class="recent-card">
      <n-data-table
        :columns="recentColumns"
        :data="recent.items"
        :loading="recentLoading"
        :pagination="false"
        :bordered="false"
        size="small"
      />
      <div class="pagination-row">
        <n-pagination
          v-model:page="page"
          :page-size="pageSize"
          :item-count="recent.total"
          :page-slot="isMobile ? 5 : 7"
        />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import AnalyticsHistoryButton from '@/components/AnalyticsHistoryButton.vue'
import { computed, h, onMounted, ref, watch } from 'vue'
import { NTag, useMessage, type DataTableColumns } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import {
  getPluginUninstallBrowsers,
  getPluginUninstallDaily,
  getPluginUninstallOs,
  getPluginUninstallRecent,
  getPluginUninstallRetention,
  getPluginUninstallSummary,
  getPluginUninstallVersions,
  type DailyUninstall,
  type PluginUninstallSummary,
  type UninstallDistribution,
  type UninstallRecentResponse,
  type UninstallRecord,
  type UninstallRetention,
} from '@/api/pluginUninstall'
import type { AnalyticsRange } from '@/api/analyticsRange'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
])

const message = useMessage()
const loading = ref(false)
const recentLoading = ref(false)
const range = ref<AnalyticsRange>('30d')
const page = ref(1)
const pageSize = 20
const isMobile = computed(() => window.innerWidth < 768)

const rangeOptions: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
]

const summary = ref<PluginUninstallSummary>({
  today_uninstalls: 0,
  yesterday_uninstalls: 0,
  last7d_uninstalls: 0,
  last30d_uninstalls: 0,
  total_uninstalls: 0,
  avg_install_days: 0,
  uninstall_rate_7d: 0,
  uninstall_rate_30d: 0,
  top_uninstall_version: '',
})
const daily = ref<DailyUninstall[]>([])
const versions = ref<UninstallDistribution[]>([])
const browsers = ref<UninstallDistribution[]>([])
const osList = ref<UninstallDistribution[]>([])
const retention = ref<UninstallRetention[]>([])
const showChartLabels = ref(false)
const showMetricNotes = ref(false)
const showPercent = ref(false)
const recent = ref<UninstallRecentResponse>({
  total: 0,
  page: 1,
  pageSize,
  items: [],
})

type VersionMode = 'full' | 'prefix' | 'suffix'
const versionMode = ref<VersionMode>('full')
const versionModeOptions: Array<{ label: string; value: VersionMode }> = [
  { label: '完整版本', value: 'full' },
  { label: '马甲(前两位)', value: 'prefix' },
  { label: '版本号(后两位)', value: 'suffix' },
]

const browserLabels: Record<string, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  '360': '360浏览器',
  other: '其他',
}

const osLabels: Record<string, string> = {
  win: 'Windows',
  mac: 'macOS',
  linux: 'Linux',
  android: 'Android',
  other: '其他',
}

const baseTextStyle = {
  color: 'rgba(255, 255, 255, 0.82)',
  fontFamily: 'inherit',
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

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

function formatAxisTooltip(params: unknown, units: Record<string, string>): string {
  const items = Array.isArray(params) ? (params as TooltipParam[]) : [params as TooltipParam]
  const title = items[0]?.axisValueLabel ?? ''
  const rows = items.map((item) => {
    const name = item.seriesName ?? ''
    const unit = units[name] ? ` ${units[name]}` : ''
    return `${item.marker ?? ''}${name}: ${formatNumber(item.value)}${unit}`
  })

  return [title, ...rows].filter(Boolean).join('<br/>')
}

const rangeLabel = computed(() => rangeOptions.find((option) => option.value === range.value)?.label ?? '')

const pieLabel = computed(() => ({
  color: 'rgba(255, 255, 255, 0.82)',
  formatter: showPercent.value ? '{b}: {d}%' : '{b}: {c}',
}))

const pieTooltip = computed(() => ({
  trigger: 'item' as const,
  formatter: showPercent.value ? '{b}: {d}% ({c})' : '{b}: {c} ({d}%)',
}))

const dailyOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) =>
      formatAxisTooltip(params, {
        卸载数: '次',
        平均使用天数: '天',
      }),
  },
  legend: {
    data: ['卸载数', '平均使用天数'],
    selected: {
      卸载数: true,
      平均使用天数: false,
    },
    textStyle: baseTextStyle,
    top: 8,
    itemGap: 20,
  },
  grid: { left: 48, right: 64, top: 56, bottom: 36, containLabel: true },
  xAxis: {
    type: 'category',
    data: daily.value.map((item) => item.date.slice(5)),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: [
    {
      type: 'value',
      name: '卸载数 (次)',
      minInterval: 1,
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
    {
      type: 'value',
      name: '平均使用天数 (天)',
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { show: false },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
  ],
  series: [
    {
      name: '卸载数',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.uninstalls),
      itemStyle: { color: '#ef4444' },
      areaStyle: { color: 'rgba(239, 68, 68, 0.12)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '平均使用天数',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: daily.value.map((item) => item.avg_install_days),
      itemStyle: { color: '#f59e0b' },
      label: createLineLabel(daily.value.length),
    },
  ],
}))

function pieOption(items: UninstallDistribution[], labels?: Record<string, string>): EChartsOption {
  return {
    tooltip: pieTooltip.value,
    legend: {
      bottom: 0,
      textStyle: baseTextStyle,
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '45%'],
        data: items.map((item) => ({
          name: labels?.[item.name] || item.name || '未知',
          value: item.uninstall_count,
        })),
        label: pieLabel.value,
      },
    ],
  }
}

const processedVersions = computed<UninstallDistribution[]>(() => {
  if (versionMode.value === 'full') {
    return versions.value
  }

  const map = new Map<string, { uninstall_count: number; install_days_total: number }>()
  for (const item of versions.value) {
    const version = item.name || '未知'
    const segments = version.split('.')
    let key: string
    if (versionMode.value === 'prefix') {
      key = segments.length >= 2 ? segments.slice(0, 2).join('.') : version
    } else {
      key = segments.length > 2 ? segments.slice(2).join('.') : version
    }
    const current = map.get(key) ?? { uninstall_count: 0, install_days_total: 0 }
    current.uninstall_count += item.uninstall_count
    current.install_days_total += item.avg_install_days * item.uninstall_count
    map.set(key, current)
  }

  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      uninstall_count: value.uninstall_count,
      avg_install_days: value.uninstall_count > 0 ? value.install_days_total / value.uninstall_count : 0,
    }))
    .sort((a, b) => b.uninstall_count - a.uninstall_count)
})

const versionOption = computed<EChartsOption>(() => pieOption(processedVersions.value))
const browserOption = computed<EChartsOption>(() => pieOption(browsers.value, browserLabels))
const osOption = computed<EChartsOption>(() => pieOption(osList.value, osLabels))

const retentionOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, top: 24, bottom: 36, containLabel: true },
  xAxis: {
    type: 'category',
    data: retention.value.map((item) => item.bucket),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
  },
  series: [
    {
      type: 'bar',
      data: retention.value.map((item) => item.uninstall_count),
      itemStyle: { color: '#60a5fa' },
      barMaxWidth: 36,
    },
  ],
}))

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function shortUuid(uuid: string): string {
  if (!uuid) return '-'
  return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`
}

const recentColumns: DataTableColumns<UninstallRecord> = [
  {
    title: '卸载时间',
    key: 'updated_at',
    render: (row) => formatTime(row.updated_at),
  },
  {
    title: '匿名 UUID',
    key: 'uuid',
    render: (row) => shortUuid(row.uuid),
  },
  {
    title: '版本',
    key: 'version',
    render: (row) => h(NTag, { size: 'small', bordered: false }, { default: () => row.version }),
  },
  {
    title: '浏览器',
    key: 'browser',
    render: (row) => browserLabels[row.browser] || row.browser,
  },
  {
    title: '系统',
    key: 'os',
    render: (row) => osLabels[row.os] || row.os,
  },
  {
    title: '使用天数',
    key: 'install_days',
    render: (row) => (row.install_days > 0 ? `${row.install_days} 天` : '-'),
  },
  {
    title: '下载计数',
    key: 'downloads',
  },
]

let latestRequestId = 0
let latestRecentRequestId = 0

async function loadSection<T>(
  requestId: number,
  request: Promise<{ data: T }>,
  apply: (data: T) => void,
): Promise<boolean> {
  try {
    const response = await request
    if (requestId === latestRequestId) apply(response.data)
    return true
  } catch (error) {
    if (requestId === latestRequestId) {
      console.error('[PluginUninstall] section fetch failed:', error)
      return false
    }
    return true
  }
}

async function loadRangeSections(requestId: number, forceFresh = false): Promise<boolean> {
  const results = await Promise.all([
    loadSection(requestId, getPluginUninstallDaily(range.value, forceFresh), (data) => { daily.value = data ?? [] }),
    loadSection(requestId, getPluginUninstallVersions(range.value, forceFresh), (data) => { versions.value = data ?? [] }),
    loadSection(requestId, getPluginUninstallBrowsers(range.value, forceFresh), (data) => { browsers.value = data ?? [] }),
    loadSection(requestId, getPluginUninstallOs(range.value, forceFresh), (data) => { osList.value = data ?? [] }),
    loadSection(requestId, getPluginUninstallRetention(range.value, forceFresh), (data) => { retention.value = data ?? [] }),
  ])
  return results.every(Boolean)
}

async function fetchRecent(forceFresh = false) {
  const requestId = ++latestRecentRequestId
  recentLoading.value = true
  try {
    const recentRes = await getPluginUninstallRecent(page.value, pageSize, forceFresh)
    if (requestId !== latestRecentRequestId) return
    recent.value = recentRes.data ?? recent.value
  } catch (error) {
    if (requestId === latestRecentRequestId) {
      console.error('[PluginUninstall] recent fetch failed:', error)
      message.error('获取卸载记录失败')
    }
  } finally {
    if (requestId === latestRecentRequestId) recentLoading.value = false
  }
}

async function fetchAll(forceFresh = false) {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const [summaryOk, rangeOk] = await Promise.all([
      loadSection(requestId, getPluginUninstallSummary(forceFresh), (data) => { summary.value = data ?? summary.value }),
      loadRangeSections(requestId, forceFresh),
      fetchRecent(forceFresh),
    ])
    if ((!summaryOk || !rangeOk) && requestId === latestRequestId) {
      message.error('部分插件卸载统计加载失败')
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

async function fetchRangeData() {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const ok = await loadRangeSections(requestId)
    if (!ok && requestId === latestRequestId) {
      message.error('部分插件卸载统计加载失败')
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

watch(range, fetchRangeData)

watch(page, () => fetchRecent())

onMounted(fetchAll)
</script>

<style scoped>
.plugin-uninstall-page {
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

.chart-grid,
.recent-card {
  margin-top: 16px;
}

.chart-label-toggle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  white-space: nowrap;
}

.metric-note-toggle {
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

.version-mode-control :deep(.n-radio-button) {
  min-width: 0;
  text-align: center;
}

.version-mode-control :deep(.n-radio-button--checked) {
  background-color: rgba(16, 185, 129, 0.15) !important;
  border-color: #10b981 !important;
  box-shadow: -1px 0 0 0 #10b981 !important;
}

.version-mode-control :deep(.n-radio-button--checked),
.version-mode-control :deep(.n-radio-button--checked *) {
  color: #ffffff !important;
}

.chart {
  width: 100%;
  height: 320px;
}

.large-chart {
  height: 360px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 767px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart {
    height: 260px;
  }

  .large-chart {
    height: 280px;
  }

  .pagination-row {
    justify-content: center;
  }
}
</style>
