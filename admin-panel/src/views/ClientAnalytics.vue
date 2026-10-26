<template>
  <div class="client-analytics-page">
    <div class="page-header">
      <div>
        <h1>客户端统计</h1>
        <p>按客户端启动和真实下载统计 DAU、激活状态、版本分布和下载来源域名</p>
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
        <AnalyticsHistoryButton source="client" />
        <n-button :loading="loading" :disabled="loading" @click="fetchAnalytics(true)">刷新</n-button>
      </n-space>
    </div>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:5" responsive="screen">
      <n-gi>
        <n-card>
          <n-statistic label="今日 DAU" :value="summary.today_dau" />
          <div v-show="showMetricNotes" class="metric-note">今日发送心跳的去重设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日新增设备" :value="summary.today_new_devices" />
          <div v-show="showMetricNotes" class="metric-note">今天首次上报心跳的设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日新增激活" :value="summary.today_new_activated" />
          <div v-show="showMetricNotes" class="metric-note">今天首次绑定激活码的设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日 DAU" :value="summary.yesterday_dau" />
          <div v-show="showMetricNotes" class="metric-note">昨日发送心跳的去重设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日已激活" :value="summary.today_activated" />
          <div v-show="showMetricNotes" class="metric-note">今日活跃且激活状态为已激活</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日未激活" :value="summary.today_inactive" />
          <div v-show="showMetricNotes" class="metric-note">今日活跃且激活状态为未激活</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日活跃激活率" :value="activationRateText" />
          <div v-show="showMetricNotes" class="metric-note">今日已激活设备数 ÷ 今日 DAU</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日下载文件" :value="summary.today_downloads" />
          <div v-show="showMetricNotes" class="metric-note">今日实际下载文件总数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 7 日活跃" :value="summary.wau" />
          <div v-show="showMetricNotes" class="metric-note">近 7 天发送心跳的去重设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 30 日活跃" :value="summary.mau" />
          <div v-show="showMetricNotes" class="metric-note">近 30 天发送心跳的去重设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计已知设备" :value="summary.total_known_devices" />
          <div v-show="showMetricNotes" class="metric-note">历史所有去重设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计激活设备" :value="summary.activated_devices" />
          <div v-show="showMetricNotes" class="metric-note">已绑定激活码的设备总数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="30天未启动" :value="summary.inactive_30d_devices" />
          <div v-show="showMetricNotes" class="metric-note">超过 30 天未发送心跳的设备数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="180天未启动" :value="summary.inactive_180d_devices" />
          <div v-show="showMetricNotes" class="metric-note">超过 180 天未发送心跳的设备数</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="12" responsive="screen" class="chart-grid">
      <n-gi :span="12">
        <n-card :title="`${rangeLabel}DAU 与下载趋势`">
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
        <n-card title="激活状态分布">
          <v-chart class="chart" :option="activationOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="版本分布">
          <v-chart class="chart" :option="versionOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi span="12 m:6">
        <n-card title="系统分布">
          <v-chart class="chart" :option="osOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="下载类型分布">
          <v-chart class="chart" :option="downloadTypeOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi :span="12">
        <n-card title="下载来源域名 TOP 20">
          <v-chart class="chart large-chart" :option="domainOption" autoresize />
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
  getClientAnalyticsActivation,
  getClientAnalyticsDaily,
  getClientAnalyticsDomains,
  getClientAnalyticsDownloadTypes,
  getClientAnalyticsOs,
  getClientAnalyticsSummary,
  getClientAnalyticsVersions,
  type ClientActivationAnalytics,
  type ClientAnalyticsSummary,
  type ClientDailyAnalytics,
  type ClientDomainAnalytics,
  type ClientDownloadTypeAnalytics,
  type ClientOsAnalytics,
  type ClientVersionAnalytics,
} from '@/api/clientAnalytics'
import type { AnalyticsRangeParam } from '@/api/analyticsRange'

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
let latestRequestId = 0
const range = ref<AnalyticsRangeParam>(30)
const rangeOptions: Array<{ label: string; value: AnalyticsRangeParam }> = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
]

const summary = ref<ClientAnalyticsSummary>({
  today_dau: 0,
  yesterday_dau: 0,
  today_activated: 0,
  today_inactive: 0,
  today_expired: 0,
  today_revoked: 0,
  total_known_devices: 0,
  activated_devices: 0,
  activation_rate: 0,
  today_downloads: 0,
  today_download_batches: 0,
  wau: 0,
  mau: 0,
  inactive_30d_devices: 0,
  inactive_180d_devices: 0,
  today_new_devices: 0,
  today_new_activated: 0,
})
const daily = ref<ClientDailyAnalytics[]>([])
const versions = ref<ClientVersionAnalytics[]>([])
const activation = ref<ClientActivationAnalytics[]>([])
const osStats = ref<ClientOsAnalytics[]>([])
const domains = ref<ClientDomainAnalytics[]>([])
const downloadTypes = ref<ClientDownloadTypeAnalytics[]>([])
const showChartLabels = ref(false)
const showMetricNotes = ref(false)

const statusLabels: Record<string, string> = {
  activated: '已激活',
  inactive: '未激活',
  expired: '已过期',
  revoked: '已吊销',
}

const downloadTypeLabels: Record<string, string> = {
  all: '全部',
  main: '主图',
  sku: 'SKU图',
  detail: '详情图',
  video: '视频',
  mixed: '混合',
  unknown: '未知',
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
const activationRateText = computed(() => `${(summary.value.activation_rate * 100).toFixed(1)}%`)

const dailyOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) =>
      formatAxisTooltip(params, {
        DAU: '人',
        '新增设备': '人',
        '新增激活': '人',
        已激活活跃: '人',
        未激活活跃: '人',
        下载文件: '次',
      }),
  },
  legend: {
    data: ['DAU', '新增设备', '新增激活', '已激活活跃', '未激活活跃', '下载文件'],
    selected: {
      DAU: false,
      新增设备: true,
      新增激活: false,
      已激活活跃: false,
      未激活活跃: false,
      下载文件: false,
    },
    textStyle: baseTextStyle,
    top: 8,
  },
  grid: { left: 16, right: 56, top: 64, bottom: 16, containLabel: true },
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
      name: '下载文件 (次)',
      minInterval: 1,
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { show: false },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
  ],
  series: [
    {
      name: 'DAU',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.dau),
      itemStyle: { color: '#54bc4a' },
      areaStyle: { color: 'rgba(84, 188, 74, 0.12)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '新增设备',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.new_devices),
      itemStyle: { color: '#f5a623' },
      areaStyle: { color: 'rgba(245, 166, 35, 0.10)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '新增激活',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.new_activated),
      itemStyle: { color: '#a855f7' },
      areaStyle: { color: 'rgba(168, 85, 247, 0.10)' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '已激活活跃',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.activated),
      itemStyle: { color: '#22c55e' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '未激活活跃',
      type: 'line',
      smooth: true,
      data: daily.value.map((item) => item.inactive),
      itemStyle: { color: '#f59e0b' },
      label: createLineLabel(daily.value.length),
    },
    {
      name: '下载文件',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: daily.value.map((item) => item.downloads),
      itemStyle: { color: '#60a5fa' },
      label: createLineLabel(daily.value.length),
    },
  ],
}))

const activationOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: baseTextStyle },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      data: activation.value.map((item) => ({
        name: statusLabels[item.activation_status] || item.activation_status,
        value: item.user_count,
      })),
      label: { color: 'rgba(255, 255, 255, 0.82)' },
    },
  ],
}))

const versionOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: baseTextStyle },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      data: versions.value.map((item) => ({
        name: item.version,
        value: item.user_count,
      })),
      label: { color: 'rgba(255, 255, 255, 0.82)' },
    },
  ],
}))

const osOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: baseTextStyle },
  series: [
    {
      type: 'pie',
      radius: '68%',
      center: ['50%', '45%'],
      data: osStats.value.map((item) => ({
        name: item.os_type || 'unknown',
        value: item.user_count,
      })),
      label: { color: 'rgba(255, 255, 255, 0.82)' },
    },
  ],
}))

const downloadTypeOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: baseTextStyle },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      data: downloadTypes.value.map((item) => ({
        name: downloadTypeLabels[item.download_type] || item.download_type,
        value: item.download_count,
      })),
      label: { color: 'rgba(255, 255, 255, 0.82)' },
    },
  ],
}))

const domainOption = computed<EChartsOption>(() => {
  const reversed = [...domains.value].reverse()
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 16, right: 28, top: 16, bottom: 16, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    },
    yAxis: {
      type: 'category',
      data: reversed.map((item) => item.site_domain),
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
    },
    series: [
      {
        name: '下载文件',
        type: 'bar',
        data: reversed.map((item) => item.download_count),
        itemStyle: { color: '#38bdf8' },
        barMaxWidth: 16,
      },
    ],
  }
})

async function fetchAnalytics(forceFresh = false) {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const [summaryOk, rangeOk] = await Promise.all([
      loadSection(requestId, getClientAnalyticsSummary(forceFresh), (data) => { summary.value = data ?? summary.value }),
      loadRangeSections(requestId, forceFresh),
    ])
    if ((!summaryOk || !rangeOk) && requestId === latestRequestId) {
      message.error('部分客户端统计加载失败')
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
      message.error('部分客户端统计加载失败')
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
      console.error('[ClientAnalytics] section fetch failed:', error)
      return false
    }
    return true
  }
}

async function loadRangeSections(requestId: number, forceFresh = false): Promise<boolean> {
  const results = await Promise.all([
    loadSection(requestId, getClientAnalyticsDaily(range.value, forceFresh), (data) => { daily.value = data ?? [] }),
    loadSection(requestId, getClientAnalyticsVersions(range.value, forceFresh), (data) => { versions.value = data ?? [] }),
    loadSection(requestId, getClientAnalyticsActivation(range.value, forceFresh), (data) => { activation.value = data ?? [] }),
    loadSection(requestId, getClientAnalyticsOs(range.value, forceFresh), (data) => { osStats.value = data ?? [] }),
    loadSection(requestId, getClientAnalyticsDomains(range.value, forceFresh), (data) => { domains.value = data ?? [] }),
    loadSection(requestId, getClientAnalyticsDownloadTypes(range.value, forceFresh), (data) => { downloadTypes.value = data ?? [] }),
  ])
  return results.every(Boolean)
}

watch(range, fetchRangeData)

onMounted(fetchAnalytics)
</script>

<style scoped>
.client-analytics-page {
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
