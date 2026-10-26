<template>
  <div class="plugin-newtab-page">
    <div class="page-header">
      <div>
        <h1>新标签页统计</h1>
        <p>统计真实打开当图新标签页的匿名用户，用于判断新标签页是否被其他扩展抢占</p>
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
        <AnalyticsHistoryButton source="newtab" />
        <n-button :loading="loading" :disabled="loading" @click="fetchAnalytics(true)">刷新</n-button>
      </n-space>
    </div>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:4" responsive="screen">
      <n-gi>
        <n-card>
          <n-statistic label="今日 DAU" :value="summary.today_dau" />
          <div v-show="showMetricNotes" class="metric-note">今日打开新标签页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日新增 DAU" :value="summary.today_new_dau" />
          <div v-show="showMetricNotes" class="metric-note">今天首次打开新标签页的用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日新增 DAU" :value="summary.yesterday_new_dau" />
          <div v-show="showMetricNotes" class="metric-note">昨天首次打开新标签页的用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日 DAU" :value="summary.yesterday_dau" />
          <div v-show="showMetricNotes" class="metric-note">昨日打开新标签页的去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 7 日活跃" :value="summary.wau" />
          <div v-show="showMetricNotes" class="metric-note">近 7 天去重活跃用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 30 日活跃" :value="summary.mau" />
          <div v-show="showMetricNotes" class="metric-note">近 30 天去重活跃用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计用户" :value="summary.total_users" />
          <div v-show="showMetricNotes" class="metric-note">历史所有去重用户数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日上报次数" :value="summary.today_reports" />
          <div v-show="showMetricNotes" class="metric-note">今日新标签页上报事件总次数</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="12" responsive="screen" class="chart-grid">
      <n-gi :span="12">
        <n-card :title="`${rangeLabel}新标签页 DAU 趋势`">
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
        <n-card title="版本分布">
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
        <n-card title="浏览器分布">
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
        <n-card title="语言分布">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>百分比</span>
              <n-switch v-model:value="showPercent" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="languageOption" autoresize />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import AnalyticsHistoryButton from '@/components/AnalyticsHistoryButton.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import {
  getPluginNewtabBrowsers,
  getPluginNewtabDaily,
  getPluginNewtabLanguages,
  getPluginNewtabOs,
  getPluginNewtabSummary,
  getPluginNewtabVersions,
  type NewtabBrowserAnalytics,
  type NewtabDailyAnalytics,
  type NewtabLanguageAnalytics,
  type NewtabOsAnalytics,
  type NewtabVersionAnalytics,
  type PluginNewtabSummary,
} from '@/api/pluginNewtab'
import type { AnalyticsRange } from '@/api/analyticsRange'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
])

const message = useMessage()
const loading = ref(false)
let latestRequestId = 0
const range = ref<AnalyticsRange>('30d')
const rangeOptions: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
]

const summary = ref<PluginNewtabSummary>({
  today_dau: 0,
  yesterday_dau: 0,
  total_users: 0,
  today_reports: 0,
  wau: 0,
  mau: 0,
  today_new_dau: 0,
  yesterday_new_dau: 0,
})
const daily = ref<NewtabDailyAnalytics[]>([])
const versions = ref<NewtabVersionAnalytics[]>([])
const browsers = ref<NewtabBrowserAnalytics[]>([])
const osList = ref<NewtabOsAnalytics[]>([])
const languages = ref<NewtabLanguageAnalytics[]>([])
const showChartLabels = ref(false)
const showMetricNotes = ref(false)
const showPercent = ref(false)

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
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
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
        '日活跃用户 (DAU)': '人',
        '新增 DAU': '人',
        上报次数: '次',
      }),
  },
  legend: {
    data: ['日活跃用户 (DAU)', '新增 DAU', '上报次数'],
    selected: {
      '日活跃用户 (DAU)': false,
      '新增 DAU': true,
      上报次数: false,
    },
    textStyle: baseTextStyle,
    top: 8,
    itemGap: 20,
  },
  grid: { left: 48, right: 56, top: 56, bottom: 36, containLabel: true },
  xAxis: {
    type: 'category',
    data: daily.value.map((item) => item.date.slice(5)),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: [
    {
      type: 'value',
      name: '活跃用户 (人)',
      minInterval: 1,
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
    {
      type: 'value',
      name: '上报次数 (次)',
      minInterval: 1,
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { show: false },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
  ],
  series: [
    {
      name: '日活跃用户 (DAU)',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.dau),
      itemStyle: { color: '#54bc4a' },
      areaStyle: { color: 'rgba(84, 188, 74, 0.12)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '新增 DAU',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.new_dau),
      itemStyle: { color: '#f5a623' },
      areaStyle: { color: 'rgba(245, 166, 35, 0.10)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '上报次数',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: daily.value.map((item) => item.reports),
      itemStyle: { color: '#60a5fa' },
      label: createLineLabel(daily.value.length),
    },
  ],
}))

const processedVersions = computed(() => {
  if (versionMode.value === 'full') {
    return versions.value
  }

  const map = new Map<string, { user_count: number; report_events: number }>()
  for (const item of versions.value) {
    const segments = item.version.split('.')
    let key: string
    if (versionMode.value === 'prefix') {
      key = segments.length >= 2 ? segments.slice(0, 2).join('.') : item.version
    } else {
      key = segments.length > 2 ? segments.slice(2).join('.') : item.version
    }
    const current = map.get(key) ?? { user_count: 0, report_events: 0 }
    current.user_count += item.user_count
    current.report_events += item.report_events
    map.set(key, current)
  }

  return Array.from(map.entries())
    .map(([version, value]) => ({ version, ...value }))
    .sort((a, b) => b.user_count - a.user_count)
})

const versionOption = computed<EChartsOption>(() => ({
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
      data: processedVersions.value.map((item) => ({
        name: item.version,
        value: item.user_count,
      })),
      label: pieLabel.value,
    },
  ],
}))

const browserOption = computed<EChartsOption>(() => ({
  tooltip: pieTooltip.value,
  legend: {
    bottom: 0,
    textStyle: baseTextStyle,
  },
  series: [
    {
      type: 'pie',
      radius: '68%',
      center: ['50%', '45%'],
      data: browsers.value.map((item) => ({
        name: browserLabels[item.browser] || item.browser,
        value: item.user_count,
      })),
      label: pieLabel.value,
    },
  ],
}))

const osOption = computed<EChartsOption>(() => ({
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
      data: osList.value.map((item) => ({
        name: osLabels[item.os] || item.os,
        value: item.user_count,
      })),
      label: pieLabel.value,
    },
  ],
}))

const languageOption = computed<EChartsOption>(() => ({
  tooltip: pieTooltip.value,
  legend: {
    bottom: 0,
    textStyle: baseTextStyle,
  },
  series: [
    {
      type: 'pie',
      radius: '68%',
      center: ['50%', '45%'],
      data: languages.value.map((item) => ({
        name: item.language,
        value: item.user_count,
      })),
      label: pieLabel.value,
    },
  ],
}))

async function fetchAnalytics(forceFresh = false) {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const [summaryOk, rangeOk] = await Promise.all([
      loadSection(requestId, getPluginNewtabSummary(forceFresh), (data) => { summary.value = data ?? summary.value }),
      loadRangeSections(requestId, forceFresh),
    ])
    if ((!summaryOk || !rangeOk) && requestId === latestRequestId) {
      message.error('部分新标签页统计加载失败')
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
      message.error('部分新标签页统计加载失败')
    }
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

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
      console.error('[PluginNewtab] section fetch failed:', error)
      return false
    }
    return true
  }
}

async function loadRangeSections(requestId: number, forceFresh = false): Promise<boolean> {
  const results = await Promise.all([
    loadSection(requestId, getPluginNewtabDaily(range.value, forceFresh), (data) => { daily.value = data ?? [] }),
    loadSection(requestId, getPluginNewtabVersions(range.value, forceFresh), (data) => { versions.value = data ?? [] }),
    loadSection(requestId, getPluginNewtabBrowsers(range.value, forceFresh), (data) => { browsers.value = data ?? [] }),
    loadSection(requestId, getPluginNewtabOs(range.value, forceFresh), (data) => { osList.value = data ?? [] }),
    loadSection(requestId, getPluginNewtabLanguages(range.value, forceFresh), (data) => { languages.value = data ?? [] }),
  ])
  return results.every(Boolean)
}

watch(range, fetchRangeData)

onMounted(fetchAnalytics)
</script>

<style scoped>
.plugin-newtab-page {
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

.chart-grid {
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
}
</style>
