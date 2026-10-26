<template>
  <div class="plugin-analytics-page">
    <div class="page-header">
      <div>
        <h1>插件统计</h1>
        <p>GetPic 用户增长、活跃、下载与流失总览</p>
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
        <AnalyticsHistoryButton source="downloads" />
        <n-button :loading="loading" :disabled="loading" @click="fetchAnalytics(true)">刷新</n-button>
      </n-space>
    </div>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:4" responsive="screen">
      <n-gi>
        <n-card>
          <n-statistic label="今日新增 UUID" :value="summary.today_new_users" />
          <div v-show="showMetricNotes" class="metric-note">今天首次下载上报的 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日卸载 UUID" :value="uninstallSummary.today_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">今天唯一卸载上报的 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic
            label="今日净增长"
            :value="todayNetGrowth"
            :value-style="{ color: todayNetGrowth >= 0 ? '#54bc4a' : '#ef4444' }"
          />
          <div v-show="showMetricNotes" class="metric-note">今日新增 UUID 减去今日卸载 UUID</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic
            label="近 7 日累计净增"
            :value="last7dNetGrowth"
            :value-style="{ color: last7dNetGrowth >= 0 ? '#54bc4a' : '#ef4444' }"
          />
          <div v-show="showMetricNotes" class="metric-note">近 7 天新增 UUID 合计减去卸载 UUID 合计（含今天）</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日新增 UUID" :value="summary.yesterday_new_users" />
          <div v-show="showMetricNotes" class="metric-note">昨天首次下载上报的 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日卸载 UUID" :value="uninstallSummary.yesterday_uninstalls" />
          <div v-show="showMetricNotes" class="metric-note">昨天唯一卸载上报的 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic
            label="昨日净增长"
            :value="yesterdayNetGrowth"
            :value-style="{ color: yesterdayNetGrowth >= 0 ? '#54bc4a' : '#ef4444' }"
          />
          <div v-show="showMetricNotes" class="metric-note">昨日新增 UUID 减去昨日卸载 UUID</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic
            label="近 30 日累计净增"
            :value="last30dNetGrowth"
            :value-style="{ color: last30dNetGrowth >= 0 ? '#54bc4a' : '#ef4444' }"
          />
          <div v-show="showMetricNotes" class="metric-note">近 30 天新增 UUID 合计减去卸载 UUID 合计（含今天）</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" cols="2 s:4 m:4" responsive="screen" class="secondary-summary-grid">
      <n-gi>
        <n-card>
          <n-statistic label="今日 DAU" :value="summary.today_dau" />
          <div v-show="showMetricNotes" class="metric-note">按下载按钮触发统计，UUID 每日去重</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="昨日 DAU" :value="summary.yesterday_dau" />
          <div v-show="showMetricNotes" class="metric-note">按下载按钮触发统计，UUID 每日去重</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 7 日活跃" :value="summary.wau" />
          <div v-show="showMetricNotes" class="metric-note">近 7 天去重活跃 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="近 30 日活跃" :value="summary.mau" />
          <div v-show="showMetricNotes" class="metric-note">近 30 天去重活跃 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="累计 UUID" :value="summary.total_users" />
          <div v-show="showMetricNotes" class="metric-note">历史所有去重 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="今日下载事件" :value="summary.today_downloads" />
          <div v-show="showMetricNotes" class="metric-note">今日下载按钮触发总次数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="30天未活跃" :value="summary.inactive_30d_users" />
          <div v-show="showMetricNotes" class="metric-note">超过 30 天未活跃的 UUID 数</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <n-statistic label="180天未活跃" :value="summary.inactive_180d_users" />
          <div v-show="showMetricNotes" class="metric-note">超过 180 天未活跃的 UUID 数</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="12" responsive="screen" class="chart-grid">
      <n-gi :span="12">
        <n-card :title="`${rangeLabel}新增、卸载与净增长趋势`">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>显示数值</span>
              <n-switch v-model:value="showChartLabels" size="small" />
            </n-space>
          </template>
          <v-chart class="chart large-chart" :option="growthOption" autoresize />
        </n-card>
      </n-gi>

      <n-gi :span="12">
        <n-card :title="`${rangeLabel}DAU 与下载事件趋势`">
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
        <n-card title="下载类型分布">
          <v-chart class="chart" :option="downloadTypeOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="首次下载域名 TOP 20">
          <v-chart class="chart" :option="domainOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi span="12 m:6">
        <n-card title="实际下载域名 TOP 20">
          <v-chart class="chart" :option="domainDownloadOption" autoresize />
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
  getPluginAnalyticsBrowsers,
  getPluginAnalyticsDaily,
  getPluginAnalyticsDomainDownloadStats,
  getPluginAnalyticsDomains,
  getPluginAnalyticsDownloadTypes,
  getPluginAnalyticsSummary,
  getPluginAnalyticsVersions,
  type BrowserAnalytics,
  type DailyAnalytics,
  type DomainAnalytics,
  type DomainDownloadAnalytics,
  type DownloadTypeAnalytics,
  type PluginAnalyticsSummary,
  type VersionAnalytics,
} from '@/api/pluginAnalytics'
import {
  getPluginUninstallDaily,
  getPluginUninstallSummary,
  type DailyUninstall,
  type PluginUninstallSummary,
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
let latestRequestId = 0
const range = ref<AnalyticsRange>('30d')
const rangeOptions: Array<{ label: string; value: AnalyticsRange }> = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '7 天', value: '7d' },
  { label: '30 天', value: '30d' },
  { label: '90 天', value: '90d' },
]

const summary = ref<PluginAnalyticsSummary>({
  today_dau: 0,
  yesterday_dau: 0,
  today_new_users: 0,
  yesterday_new_users: 0,
  total_users: 0,
  today_downloads: 0,
  wau: 0,
  mau: 0,
  inactive_30d_users: 0,
  inactive_180d_users: 0,
})
const uninstallSummary = ref<PluginUninstallSummary>({
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
const daily = ref<DailyAnalytics[]>([])
const uninstallDaily = ref<DailyUninstall[]>([])
const summaryGrowthDaily = ref<Array<{ date: string; new_users: number; uninstalls: number; net_growth: number }>>([])
const versions = ref<VersionAnalytics[]>([])
const browsers = ref<BrowserAnalytics[]>([])
const domains = ref<DomainAnalytics[]>([])
const domainDownloads = ref<DomainDownloadAnalytics[]>([])
const downloadTypes = ref<DownloadTypeAnalytics[]>([])
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

const downloadTypeLabels: Record<string, string> = {
  all: '全部',
  main: '主图',
  sku: 'SKU/配图',
  detail: '详情图',
  video: '视频',
  unknown: '未知',
}

const browserLabels: Record<string, string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  '360': '360浏览器',
  other: '其他',
}

const baseTextStyle = {
  color: 'rgba(255, 255, 255, 0.82)',
  fontFamily: 'inherit',
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

type TooltipParam = {
  axisValueLabel?: string
  dataIndex?: number
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
const todayNetGrowth = computed(() => summary.value.today_new_users - uninstallSummary.value.today_uninstalls)
const yesterdayNetGrowth = computed(() => summary.value.yesterday_new_users - uninstallSummary.value.yesterday_uninstalls)
const last7dNetGrowth = computed(() => summaryGrowthDaily.value
  .slice(-7)
  .reduce((total, item) => total + item.net_growth, 0))
const last30dNetGrowth = computed(() => summaryGrowthDaily.value
  .reduce((total, item) => total + item.net_growth, 0))

function mergeGrowthDaily(analyticsDaily: DailyAnalytics[], uninstallRows: DailyUninstall[]) {
  const analyticsByDate = new Map(analyticsDaily.map((item) => [item.date, item.new_users]))
  const uninstallsByDate = new Map(uninstallRows.map((item) => [item.date, item.uninstalls]))
  const dates = [...new Set([...analyticsByDate.keys(), ...uninstallsByDate.keys()])].sort()

  return dates.map((date) => {
    const newUsers = analyticsByDate.get(date) ?? 0
    const uninstalls = uninstallsByDate.get(date) ?? 0
    return {
      date,
      new_users: newUsers,
      uninstalls,
      net_growth: newUsers - uninstalls,
    }
  })
}

const growthDaily = computed(() => mergeGrowthDaily(daily.value, uninstallDaily.value))

const pieLabel = computed(() => ({
  color: 'rgba(255, 255, 255, 0.82)',
  formatter: showPercent.value ? '{b}: {d}%' : '{b}: {c}',
}))

const pieTooltip = computed(() => ({
  trigger: 'item' as const,
  formatter: showPercent.value ? '{b}: {d}% ({c})' : '{b}: {c} ({d}%)',
}))

const growthOption = computed<EChartsOption>(() => ({
  animationDuration: 250,
  animationDurationUpdate: 0,
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) =>
      formatAxisTooltip(params, {
        '每日新增 UUID': '人',
        '每日卸载 UUID': '人',
        每日净增长: '人',
      }),
  },
  legend: {
    data: ['每日新增 UUID', '每日卸载 UUID', '每日净增长'],
    selected: {
      '每日新增 UUID': false,
      '每日卸载 UUID': false,
      每日净增长: true,
    },
    textStyle: baseTextStyle,
    top: 8,
    itemGap: 20,
  },
  grid: { left: 48, right: 32, top: 56, bottom: 36, containLabel: true },
  xAxis: {
    type: 'category',
    data: growthDaily.value.map((item) => item.date.slice(5)),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: {
    type: 'value',
    name: '用户数 (人)',
    minInterval: 1,
    nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
  },
  series: [
    {
      name: '每日新增 UUID',
      type: 'line',
      smooth: true,
      data: growthDaily.value.map((item) => item.new_users),
      itemStyle: { color: '#f59e0b' },
      label: createLineLabel(growthDaily.value.length),
    },
    {
      name: '每日卸载 UUID',
      type: 'line',
      smooth: true,
      data: growthDaily.value.map((item) => item.uninstalls),
      itemStyle: { color: '#ef4444' },
      label: createLineLabel(growthDaily.value.length),
    },
    {
      name: '每日净增长',
      type: 'line',
      smooth: true,
      data: growthDaily.value.map((item) => item.net_growth),
      itemStyle: { color: '#54bc4a' },
      lineStyle: { width: 3 },
      areaStyle: { color: 'rgba(84, 188, 74, 0.10)' },
      label: createLineLabel(growthDaily.value.length),
    },
  ],
}))

const dailyOption = computed<EChartsOption>(() => ({
  animationDuration: 250,
  animationDurationUpdate: 0,
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) =>
      formatAxisTooltip(params, {
        '日活跃用户 (DAU)': '人',
        下载事件: '次',
      }),
  },
  legend: {
    data: ['日活跃用户 (DAU)', '下载事件'],
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
      name: '用户数 (人)',
      minInterval: 1,
      alignTicks: true,
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)', formatter: (value: number | string) => formatNumber(value) },
    },
    {
      type: 'value',
      name: '下载事件 (次)',
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
      name: '下载事件',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: daily.value.map((item) => item.downloads),
      itemStyle: { color: '#60a5fa' },
      label: createLineLabel(daily.value.length),
    },
  ],
}))

const processedVersions = computed(() => {
  if (versionMode.value === 'full') {
    return versions.value
  }

  const map = new Map<string, number>()
  for (const item of versions.value) {
    const segments = item.version.split('.')
    let key: string
    if (versionMode.value === 'prefix') {
      key = segments.length >= 2 ? segments.slice(0, 2).join('.') : item.version
    } else {
      key = segments.length > 2 ? segments.slice(2).join('.') : item.version
    }
    map.set(key, (map.get(key) ?? 0) + item.user_count)
  }

  return Array.from(map.entries())
    .map(([version, user_count]) => ({ version, user_count }))
    .sort((a, b) => b.user_count - a.user_count)
})

const versionOption = computed<EChartsOption>(() => ({
  animationDuration: 250,
  animationDurationUpdate: 0,
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
  animationDuration: 250,
  animationDurationUpdate: 0,
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

const downloadTypeOption = computed<EChartsOption>(() => ({
  animationDuration: 250,
  animationDurationUpdate: 0,
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    textStyle: baseTextStyle,
  },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '45%'],
      data: downloadTypes.value.map((item) => ({
        name: downloadTypeLabels[item.download_type] || item.download_type,
        value: item.user_count,
      })),
      label: { color: 'rgba(255, 255, 255, 0.82)' },
    },
  ],
}))

const domainOption = computed<EChartsOption>(() => {
  const reversed = [...domains.value].reverse()
  return {
    animationDuration: 250,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as TooltipParam
        const row = reversed[item?.dataIndex ?? 0]
        if (!row) return ''
        return [
          row.site_domain,
          `去重用户: ${formatNumber(row.user_count)} 人`,
          `下载事件: ${formatNumber(row.download_events)} 次`,
        ].join('<br/>')
      },
    },
    grid: { left: 120, right: 24, top: 16, bottom: 24 },
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
        name: '去重用户',
        type: 'bar',
        data: reversed.map((item) => item.user_count),
        itemStyle: { color: '#f59e0b' },
        barMaxWidth: 16,
      },
    ],
  }
})

const domainDownloadOption = computed<EChartsOption>(() => {
  const reversed = [...domainDownloads.value].reverse()
  return {
    animationDuration: 250,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as TooltipParam
        const row = reversed[item?.dataIndex ?? 0]
        if (!row) return ''
        return [
          row.site_domain,
          `下载次数: ${formatNumber(row.download_count)} 次`,
          `去重用户: ${formatNumber(row.unique_users)} 人`,
        ].join('<br/>')
      },
    },
    grid: { left: 120, right: 24, top: 16, bottom: 24 },
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
        name: '下载次数',
        type: 'bar',
        data: reversed.map((item) => item.download_count),
        itemStyle: { color: '#10b981' },
        barMaxWidth: 16,
      },
    ],
  }
})

/**
 * 性能契约：
 * 1. 摘要与图表同时请求、各自返回时更新；相同范围的趋势请求必须复用；
 * 2. latestRequestId 防止快速切换范围时旧响应覆盖新响应；
 * 3. 手动刷新才传 forceFresh，普通进入页面应命中后端短缓存。
 *
 * 不要把所有接口恢复成一个“全部成功后才赋值”的大 Promise.all，否则用户又会
 * 被最慢的图表接口卡住，任一非关键图表失败也会拖成整页无数据。
 */
async function fetchAnalytics(forceFresh = false) {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    // Share the 30-day requests between cards and charts; start independent
    // sections together and render each as soon as its own response arrives.
    const dailyRequests = {
      analytics: getPluginAnalyticsDaily('30d', forceFresh),
      uninstalls: getPluginUninstallDaily('30d', forceFresh),
    }
    const results = await Promise.all([
      loadSection(requestId, getPluginAnalyticsSummary(forceFresh), (data) => { summary.value = data ?? summary.value }),
      loadSection(requestId, getPluginUninstallSummary(forceFresh), (data) => { uninstallSummary.value = data ?? uninstallSummary.value }),
      loadGrowthSummary(requestId, dailyRequests),
      loadRangeSections(requestId, forceFresh, range.value === '30d' ? dailyRequests : undefined),
    ])
    if (!results.every(Boolean) && requestId === latestRequestId) {
      message.error('部分插件统计加载失败')
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
      message.error('部分插件统计加载失败')
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
      console.error('[PluginAnalytics] section fetch failed:', error)
      return false
    }
    return true
  }
}

type DailyRequests = {
  analytics: ReturnType<typeof getPluginAnalyticsDaily>
  uninstalls: ReturnType<typeof getPluginUninstallDaily>
}
async function loadGrowthSummary(requestId: number, requests: DailyRequests): Promise<boolean> {
  try {
    const [analyticsResponse, uninstallResponse] = await Promise.all([
      requests.analytics,
      requests.uninstalls,
    ])
    if (requestId === latestRequestId) {
      summaryGrowthDaily.value = mergeGrowthDaily(
        analyticsResponse.data ?? [],
        uninstallResponse.data ?? [],
      )
    }
    return true
  } catch (error) {
    if (requestId === latestRequestId) {
      console.error('[PluginAnalytics] growth summary fetch failed:', error)
      return false
    }
    return true
  }
}

async function loadRangeSections(requestId: number, forceFresh = false, requests?: DailyRequests): Promise<boolean> {
  const results = await Promise.all([
    loadSection(requestId, requests?.analytics ?? getPluginAnalyticsDaily(range.value, forceFresh), (data) => { daily.value = data ?? [] }),
    loadSection(requestId, requests?.uninstalls ?? getPluginUninstallDaily(range.value, forceFresh), (data) => { uninstallDaily.value = data ?? [] }),
    loadSection(requestId, getPluginAnalyticsVersions(range.value, forceFresh), (data) => { versions.value = data ?? [] }),
    loadSection(requestId, getPluginAnalyticsBrowsers(range.value, forceFresh), (data) => { browsers.value = data ?? [] }),
    loadSection(requestId, getPluginAnalyticsDomains(range.value, forceFresh), (data) => { domains.value = data ?? [] }),
    loadSection(requestId, getPluginAnalyticsDomainDownloadStats(range.value, forceFresh), (data) => { domainDownloads.value = data ?? [] }),
    loadSection(requestId, getPluginAnalyticsDownloadTypes(range.value, forceFresh), (data) => { downloadTypes.value = data ?? [] }),
  ])
  return results.every(Boolean)
}

watch(range, fetchRangeData)

onMounted(fetchAnalytics)
</script>

<style scoped>
.plugin-analytics-page {
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

.secondary-summary-grid {
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
