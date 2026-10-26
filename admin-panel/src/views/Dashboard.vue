<template>
  <div class="dashboard-page">
    <div class="page-header">
      <div>
        <h1>仪表盘</h1>
        <p>销售、订单与激活趋势总览</p>
      </div>
      <n-space align="center" size="small">
        <n-space align="center" size="small" class="metric-note-toggle">
          <span>显示指标说明</span>
          <n-switch v-model:value="showMetricNotes" size="small" />
        </n-space>
        <n-button
          :loading="loading"
          :disabled="loading"
          @click="fetchStats(true)"
        >
          刷新
        </n-button>
      </n-space>
    </div>

    <div class="section-title">运营与财务</div>
    <div class="finance-metrics">
      <div class="finance-row">
        <div class="finance-row-title">今天</div>
        <n-grid :x-gap="16" :y-gap="16" cols="1 s:3" responsive="screen">
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="今日销售额">
                <template #default>{{ formatCurrency(stats.today_sales) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">
                按支付完成时间统计（人民币口径，不含港币订单）
              </div>
              <div
                class="metric-note metric-note-hkd"
                :class="{ 'metric-note-hkd--active': stats.today_stripe_hkd_sales_minor > 0 }"
              >
                Stripe 港币：{{ formatHkd(stats.today_stripe_hkd_sales_minor) }} · {{ stats.today_stripe_hkd_orders }} 笔
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="今日订单数" :value="stats.today_orders" />
              <div v-show="showMetricNotes" class="metric-note">仅统计已支付订单</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="今日退款额">
                <template #default>{{ formatCurrency(stats.today_refunds) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">按退款完成时间统计</div>
              <div class="metric-note metric-note-hkd">
                Stripe 港币退款：{{ formatHkd(stats.today_stripe_hkd_refunds_minor) }} · {{ stats.today_stripe_hkd_refund_orders }} 笔
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <div class="finance-row">
        <div class="finance-row-title">昨天</div>
        <n-grid :x-gap="16" :y-gap="16" cols="1 s:3" responsive="screen">
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="昨日销售额">
                <template #default>{{ formatCurrency(stats.yesterday_sales) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">按支付完成时间统计</div>
              <div
                class="metric-note metric-note-hkd"
                :class="{ 'metric-note-hkd--active': stats.yesterday_stripe_hkd_sales_minor > 0 }"
              >
                Stripe 港币：{{ formatHkd(stats.yesterday_stripe_hkd_sales_minor) }} · {{ stats.yesterday_stripe_hkd_orders }} 笔
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="昨日订单数" :value="stats.yesterday_orders" />
              <div v-show="showMetricNotes" class="metric-note">仅统计已支付订单</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="昨日退款额">
                <template #default>{{ formatCurrency(stats.yesterday_refunds) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">按退款完成时间统计</div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <div class="finance-row">
        <div class="finance-row-title">近 7 天</div>
        <n-grid :x-gap="16" :y-gap="16" cols="1 s:3" responsive="screen">
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 7 天销售额">
                <template #default>{{ formatCurrency(last7Sales) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">含今天，从趋势数据汇总</div>
              <div
                class="metric-note metric-note-hkd"
                :class="{ 'metric-note-hkd--active': stats.last_7_days_stripe_hkd_sales_minor > 0 }"
              >
                Stripe 港币：{{ formatHkd(stats.last_7_days_stripe_hkd_sales_minor) }} · {{ stats.last_7_days_stripe_hkd_orders }} 笔
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 7 天订单数" :value="last7Orders" />
              <div v-show="showMetricNotes" class="metric-note">含今天，从趋势数据汇总</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 7 天退款额">
                <template #default>{{ formatCurrency(stats.last_7_days_refunds) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">按退款完成时间统计</div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <div class="finance-row">
        <div class="finance-row-title">近 30 天</div>
        <n-grid :x-gap="16" :y-gap="16" cols="1 s:3" responsive="screen">
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 30 天销售额">
                <template #default>{{ formatCurrency(stats.last_30_days_sales) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">含今天，按支付完成时间统计</div>
              <div
                class="metric-note metric-note-hkd"
                :class="{ 'metric-note-hkd--active': stats.last_30_days_stripe_hkd_sales_minor > 0 }"
              >
                Stripe 港币：{{ formatHkd(stats.last_30_days_stripe_hkd_sales_minor) }} · {{ stats.last_30_days_stripe_hkd_orders }} 笔
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 30 天订单数" :value="stats.last_30_days_orders" />
              <div v-show="showMetricNotes" class="metric-note">含今天，仅统计已支付订单</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="近 30 天退款额">
                <template #default>{{ formatCurrency(stats.last_30_days_refunds) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">含今天，按退款完成时间统计</div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <div class="finance-row">
        <div class="finance-row-title">累计</div>
        <n-grid :x-gap="16" :y-gap="16" cols="1 s:3" responsive="screen">
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="累计销售额">
                <template #default>{{ formatCurrency(stats.total_sales) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">
                已排除全额退款订单（人民币口径，不含港币订单）
              </div>
              <div
                class="metric-note metric-note-hkd"
                :class="{ 'metric-note-hkd--active': stats.stripe_hkd_sales_minor > 0 }"
              >
                Stripe 港币：{{ formatHkd(stats.stripe_hkd_sales_minor) }} · {{ stats.stripe_hkd_order_count }} 笔
                <template v-if="stats.stripe_hkd_refunds_minor > 0">
                  （已退 {{ formatHkd(stats.stripe_hkd_refunds_minor) }} / {{ stats.stripe_hkd_refund_order_count }} 笔）
                </template>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="累计订单数" :value="stats.total_orders" />
              <div v-show="showMetricNotes" class="metric-note">仅统计已支付订单</div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card class="metric-card">
              <n-statistic label="累计退款额">
                <template #default>{{ formatCurrency(stats.total_refunds) }}</template>
              </n-statistic>
              <div v-show="showMetricNotes" class="metric-note">全额退款订单金额</div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>
    </div>

    <div class="section-title">激活与设备</div>
    <n-grid :x-gap="16" :y-gap="16" cols="1 s:2 m:4" responsive="screen">
      <n-gi>
        <n-card class="metric-card">
          <n-statistic label="累计激活码数" :value="stats.total_codes" />
          <div v-show="showMetricNotes" class="metric-note">已激活 {{ stats.activatedCodes }} 个</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card class="metric-card">
          <n-statistic label="激活码使用率" :value="usageRateText" />
          <div v-show="showMetricNotes" class="metric-note">禁用 {{ stats.disabledCodes }} 个</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card class="metric-card">
          <n-statistic label="已激活设备数" :value="stats.activated_devices" />
          <div v-show="showMetricNotes" class="metric-note">今日新增 {{ stats.today_activated_devices }} 台</div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card class="metric-card">
          <n-statistic label="今日激活码数" :value="stats.today_activations" />
          <div v-show="showMetricNotes" class="metric-note">昨日新增设备 {{ stats.yesterday_activated_devices }} 台</div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" cols="1 l:2" responsive="screen" class="chart-grid">
      <n-gi>
        <n-card title="近 7 天销售额与订单数">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>显示数值</span>
              <n-switch v-model:value="showSalesOrderLabels" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="salesOrderOption" autoresize />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="近 7 天激活趋势">
          <template #header-extra>
            <n-space align="center" size="small" class="chart-label-toggle">
              <span>显示数值</span>
              <n-switch v-model:value="showActivationLabels" size="small" />
            </n-space>
          </template>
          <v-chart class="chart" :option="activationOption" autoresize />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import { getDashboardStats, type DashboardStats } from '@/api/dashboard'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
])

const message = useMessage()
const loading = ref(false)
const showMetricNotes = ref(false)
const showSalesOrderLabels = ref(false)
const showActivationLabels = ref(false)
let pendingRequest: Promise<void> | null = null

/** 仪表盘统计数据默认值 */
const defaultStats: DashboardStats = {
  total_codes: 0,
  activated_devices: 0,
  today_activations: 0,
  usage_rate: 0,
  total_sales: 0,
  total_orders: 0,
  today_sales: 0,
  yesterday_sales: 0,
  today_orders: 0,
  yesterday_orders: 0,
  total_refunds: 0,
  today_refunds: 0,
  yesterday_refunds: 0,
  last_7_days_refunds: 0,
  last_30_days_sales: 0,
  last_30_days_orders: 0,
  last_30_days_refunds: 0,
  today_activated_devices: 0,
  yesterday_activated_devices: 0,
  stripe_hkd_sales_minor: 0,
  today_stripe_hkd_sales_minor: 0,
  today_stripe_hkd_orders: 0,
  yesterday_stripe_hkd_sales_minor: 0,
  yesterday_stripe_hkd_orders: 0,
  last_7_days_stripe_hkd_sales_minor: 0,
  last_7_days_stripe_hkd_orders: 0,
  last_30_days_stripe_hkd_sales_minor: 0,
  last_30_days_stripe_hkd_orders: 0,
  stripe_hkd_order_count: 0,
  stripe_hkd_refunds_minor: 0,
  stripe_hkd_refund_order_count: 0,
  today_stripe_hkd_refunds_minor: 0,
  today_stripe_hkd_refund_orders: 0,
  sales_trend: [],
  orders_trend: [],
  device_trend: [],
  activatedCodes: 0,
  disabledCodes: 0,
  statusBreakdown: {
    unused: 0,
    activated: 0,
    disabled: 0,
  },
  packageDistribution: [],
  dailyTrend: [],
}

const stats = ref<DashboardStats>({ ...defaultStats })

const baseTextStyle = {
  color: 'rgba(255, 255, 255, 0.82)',
  fontFamily: 'inherit',
}

const usageRateText = computed(() => `${(stats.value.usage_rate * 100).toFixed(1)}%`)
const last7Sales = computed(() =>
  stats.value.sales_trend.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
)
const last7Orders = computed(() =>
  stats.value.orders_trend.reduce((sum, item) => sum + Number(item.count ?? 0), 0)
)

const chartLabelStyle = {
  color: 'rgba(255, 255, 255, 0.88)',
  fontSize: 11,
  distance: 6,
}

function getChartValue(params: unknown) {
  return Number((params as { value?: unknown }).value ?? 0)
}

function formatCurrencyLabel(params: unknown) {
  return formatCurrency(getChartValue(params))
}

function formatCountLabel(params: unknown) {
  const value = getChartValue(params)
  return Number.isFinite(value) ? `${Math.round(value)}` : '-'
}

const salesOrderOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['销售额', '订单数'],
    textStyle: baseTextStyle,
    top: 8,
  },
  grid: { left: 16, right: 16, top: 64, bottom: 16, containLabel: true },
  xAxis: {
    type: 'category',
    data: stats.value.sales_trend.map((item) => item.date.slice(5)),
    axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.16)' } },
  },
  yAxis: [
    {
      type: 'value',
      name: '销售额',
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.68)',
        formatter: '¥{value}',
      },
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
    },
    {
      type: 'value',
      name: '订单数',
      minInterval: 1,
      splitLine: { show: false },
      axisLabel: { color: 'rgba(255, 255, 255, 0.68)' },
      nameTextStyle: { color: 'rgba(255, 255, 255, 0.68)' },
    },
  ],
  series: [
    {
      name: '销售额',
      type: 'bar',
      barMaxWidth: 18,
      data: stats.value.sales_trend.map((item) => Number(item.amount.toFixed(2))),
      itemStyle: { color: '#38bdf8' },
      label: {
        ...chartLabelStyle,
        show: showSalesOrderLabels.value,
        position: 'top',
        formatter: formatCurrencyLabel,
      },
    },
    {
      name: '订单数',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: stats.value.orders_trend.map((item) => item.count),
      itemStyle: { color: '#f59e0b' },
      label: {
        ...chartLabelStyle,
        show: showSalesOrderLabels.value,
        position: 'top',
        formatter: formatCountLabel,
      },
    },
  ],
}))

const activationOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: {
    data: ['激活码', '激活设备'],
    textStyle: baseTextStyle,
    top: 8,
  },
  grid: { left: 16, right: 16, top: 56, bottom: 16, containLabel: true },
  xAxis: {
    type: 'category',
    data: stats.value.dailyTrend.map((item) => item.date.slice(5)),
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
      name: '激活码',
      type: 'line',
      smooth: true,
      data: stats.value.dailyTrend.map((item) => item.count),
      itemStyle: { color: '#22c55e' },
      areaStyle: { color: 'rgba(34, 197, 94, 0.12)' },
      label: {
        ...chartLabelStyle,
        show: showActivationLabels.value,
        position: 'top',
        formatter: formatCountLabel,
      },
    },
    {
      name: '激活设备',
      type: 'line',
      smooth: true,
      data: stats.value.device_trend.map((item) => item.count),
      itemStyle: { color: '#a78bfa' },
      label: {
        ...chartLabelStyle,
        show: showActivationLabels.value,
        position: 'top',
        formatter: formatCountLabel,
      },
    },
  ],
}))

function formatCurrency(value: number | null | undefined) {
  return `¥${Number(value ?? 0).toFixed(2)}`
}

/** 港币分 → HK$ xx.xx。港币营收与人民币分轨展示，不换算成人民币。 */
function formatHkd(minor: number | null | undefined) {
  return `HK$ ${(Number(minor ?? 0) / 100).toFixed(2)}`
}

/**
 * 同一时刻只保留一个仪表盘请求。若用户在普通请求进行中主动刷新，必须在其完成后
 * 再发一次 fresh=1，不能直接复用旧请求；否则刷新按钮看似成功，实际仍是缓存数据。
 */
function fetchStats(forceFresh = false): Promise<void> {
  if (pendingRequest) {
    return forceFresh
      ? pendingRequest.then(() => fetchStats(true))
      : pendingRequest
  }

  loading.value = true
  let request!: Promise<void>
  request = (async () => {
    try {
      const { data } = await getDashboardStats(forceFresh)
      // 防御空数据：确保 stats.value 始终为有效对象，避免模板渲染崩溃
      stats.value = { ...defaultStats, ...(data ?? {}) }
    } catch {
      message.error('获取统计数据失败')
    } finally {
      loading.value = false
      if (pendingRequest === request) pendingRequest = null
    }
  })()
  pendingRequest = request
  return request
}

onMounted(() => fetchStats())
</script>

<style scoped>
.dashboard-page {
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
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 14px;
}

.section-title {
  margin: 18px 0 10px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  font-weight: 600;
}

.finance-metrics {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.finance-row-title {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 13px;
  font-weight: 600;
}

.metric-card {
  min-height: 116px;
}

.metric-card :deep(.n-card__content) {
  display: flex;
  min-height: 84px;
  flex-direction: column;
  justify-content: center;
}

.metric-note {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  line-height: 1.4;
}

/* 港币实收：始终可见（不受"显示说明"开关控制），用 Stripe 品牌紫区分币种 */
.metric-note-hkd {
  margin-top: 4px;
  color: rgba(155, 145, 255, 0.95);
  font-weight: 500;
}

/*
 * 当期确有港币收款时才加粗提亮。
 * 常驻展示的价值就在于「0 笔」也要看得见，所以默认态刻意保持低对比度，
 * 有进账时才用品牌紫实心 + 加粗把它顶起来，一眼扫到。
 */
.metric-note-hkd--active {
  color: #8b7dff;
  font-weight: 700;
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

.chart-grid {
  margin-top: 16px;
}

.chart {
  width: 100%;
  height: 340px;
}

@media (max-width: 767px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart {
    height: 240px;
  }
}
</style>
