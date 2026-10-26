<template>
  <div>
    <!-- 筛选区域 -->
    <n-card size="small" style="margin-bottom: 16px">
      <!-- 基础行：始终显示 -->
      <n-space align="center" justify="space-between" :wrap="true">
        <n-space align="center" :wrap="true">
          <n-select
            v-model:value="filterParams.status"
            :options="statusOptions"
            placeholder="状态筛选"
            style="width: 140px"
            clearable
          />
          <n-button type="primary" @click="handleSearch">查询</n-button>
          <n-button @click="handleReset">重置</n-button>
          <n-button @click="handleExport">导出 CSV</n-button>
          <n-checkbox v-model:checked="filterParams.upgradeOnly" @update:checked="handleSearch">仅看换购订单</n-checkbox>
        </n-space>
        <n-space align="center" :size="8">
          <!-- 筛选摘要：收起且有活跃筛选时显示 -->
          <span v-if="!showAdvanced && activeFilterCount > 0" class="filter-summary">
            已筛选 {{ activeFilterCount }} 项：{{ filterSummary }}
          </span>
          <n-button text @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? '收起' : '高级筛选' }}
            <template #icon>
              <n-icon :size="16">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path v-if="!showAdvanced" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                  <path v-else d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
              </n-icon>
            </template>
          </n-button>
          <!-- 活跃筛选数量徽标 + 一键清除 -->
          <n-tag
            v-if="activeFilterCount > 0"
            size="small"
            :bordered="false"
            type="info"
            round
            closable
            @close="handleReset"
            style="cursor: pointer"
            @click="showAdvanced = !showAdvanced"
          >
            {{ activeFilterCount }}
          </n-tag>
        </n-space>
      </n-space>

      <!-- 高级筛选区域：折叠/展开 -->
      <n-collapse-transition :show="showAdvanced">
        <n-grid cols="1 s:2 m:3 l:4" :x-gap="12" :y-gap="8" responsive="screen" style="margin-top: 12px">
          <n-gi>
            <span class="filter-label">订单号</span>
            <n-input v-model:value="filterParams.orderNo" placeholder="请输入订单号" clearable />
          </n-gi>
          <n-gi>
            <span class="filter-label">外部订单号</span>
            <n-input v-model:value="filterParams.tradeNo" placeholder="请输入外部订单号" clearable />
          </n-gi>
          <n-gi>
            <span class="filter-label">邮箱</span>
            <n-input v-model:value="filterParams.email" placeholder="请输入邮箱" clearable />
          </n-gi>
          <n-gi>
            <span class="filter-label">激活码</span>
            <n-input v-model:value="filterParams.activationCode" placeholder="请输入激活码" clearable />
          </n-gi>
          <n-gi>
            <span class="filter-label">套餐</span>
            <n-select
              v-model:value="filterParams.packageId"
              :options="packageOptions"
              placeholder="请选择套餐"
              clearable
            />
          </n-gi>
          <n-gi>
            <span class="filter-label">金额</span>
            <n-input-number
              v-model:value="filterParams.amount"
              placeholder="请输入金额"
              clearable
              :precision="2"
              style="width: 100%"
            />
          </n-gi>
          <n-gi>
            <span class="filter-label">支付时间</span>
            <n-date-picker
              v-model:value="filterParams.paidAtRange"
              type="daterange"
              clearable
              style="width: 100%"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            />
          </n-gi>
          <n-gi>
            <span class="filter-label">创建时间</span>
            <n-date-picker
              v-model:value="filterParams.createdAtRange"
              type="daterange"
              clearable
              style="width: 100%"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            />
          </n-gi>
        </n-grid>
      </n-collapse-transition>
    </n-card>

    <!-- 数据表格 -->
    <n-data-table
      :columns="columns"
      :data="orderList"
      :loading="loading"
      :pagination="pagination"
      :scroll-x="2490"
      :row-key="(row: OrderRecord) => row.id"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />

    <!-- 订单详情 / 换购审计弹窗 -->
    <n-modal v-model:show="showOrderDetailModal" preset="card" title="订单详情" style="width: 95%; max-width: 920px">
      <n-spin :show="orderDetailLoading">
        <template v-if="orderDetail">
          <n-descriptions bordered label-placement="left" :column="2" size="small">
            <n-descriptions-item label="订单号">{{ orderDetail.order_no }}</n-descriptions-item>
            <n-descriptions-item label="状态">{{ orderDetail.status }}</n-descriptions-item>
            <n-descriptions-item label="套餐">{{ orderDetail.package_name || '-' }}</n-descriptions-item>
            <n-descriptions-item label="实付">{{ formatAmount(orderDetail.amount) }}</n-descriptions-item>
            <n-descriptions-item label="实收（结算币种）">
              <strong :class="{ 'settled-hkd': isHkdOrder(orderDetail) }">{{ formatSettledAmount(orderDetail) }}</strong>
              <n-tag v-if="isHkdOrder(orderDetail)" size="tiny" type="info" :bordered="false" style="margin-left: 6px">
                港币
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="邮箱">{{ orderDetail.email }}</n-descriptions-item>
            <n-descriptions-item label="支付时间">{{ formatTimestamp(orderDetail.paid_at) }}</n-descriptions-item>
          </n-descriptions>

          <n-divider v-if="orderDetail.upgrade_discount != null">当图换购抵扣</n-divider>
          <n-descriptions
            v-if="orderDetail.upgrade_discount != null"
            bordered
            label-placement="left"
            :column="2"
            size="small"
          >
            <n-descriptions-item label="来源类型">
              {{ orderDetail.upgrade_source_type === 'code' ? '激活码' : '订单号' }}
            </n-descriptions-item>
            <n-descriptions-item label="抵扣金额">
              <strong class="upgrade-amount">−{{ formatAmount(orderDetail.upgrade_discount) }}</strong>
              <n-tag v-if="upgradeSnapshot?.floor_applied" type="warning" size="small" :bordered="false" style="margin-left: 8px">
                老用户保底
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="来源输入">
              <n-button text type="primary" @click="handleCopyText(orderDetail.upgrade_source_input || '', '来源凭证')">
                {{ orderDetail.upgrade_source_input || '-' }}
              </n-button>
            </n-descriptions-item>
            <n-descriptions-item label="源订单">
              <n-button text type="primary" @click="handleCopyText(orderDetail.upgrade_source_order_no || '', '源订单号')">
                {{ orderDetail.upgrade_source_order_no || '-' }}
              </n-button>
            </n-descriptions-item>
            <n-descriptions-item label="源套餐">{{ orderDetail.upgrade_source_package_name || '-' }}</n-descriptions-item>
            <n-descriptions-item label="源实付">
              {{ orderDetail.upgrade_source_paid_amount == null ? '-' : formatAmount(orderDetail.upgrade_source_paid_amount) }}
            </n-descriptions-item>
            <n-descriptions-item label="源激活码">
              <n-button text type="primary" @click="handleCopyText(orderDetail.upgrade_source_code || '', '源激活码')">
                {{ orderDetail.upgrade_source_code || '-' }}
              </n-button>
              <n-tag
                v-if="orderDetail.upgrade_source_code_status != null"
                :type="orderDetail.upgrade_source_code_status === 2 ? 'error' : 'success'"
                size="small"
                :bordered="false"
                style="margin-left: 8px"
              >
                {{ orderDetail.upgrade_source_code_status === 2 ? '已禁用' : '未禁用' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="核销时间">{{ formatTimestamp(orderDetail.upgrade_used_at) }}</n-descriptions-item>
            <n-descriptions-item label="源激活时间">
              {{ formatTimestamp(orderDetail.upgrade_source_activated_at ?? upgradeSnapshot?.activated_at) }}
            </n-descriptions-item>
            <n-descriptions-item label="源失效时间">{{ formatTimestamp(upgradeSnapshot?.expires_at) }}</n-descriptions-item>
            <n-descriptions-item label="剩余时长">
              {{ upgradeSnapshot?.remaining == null ? '-' : `${upgradeSnapshot.remaining} 天` }}
            </n-descriptions-item>
            <n-descriptions-item label="折算过程">
              {{ upgradeSnapshot?.computed == null ? '-' : `${formatAmount(upgradeSnapshot.computed)} → ${formatAmount(orderDetail.upgrade_discount)}` }}
            </n-descriptions-item>
          </n-descriptions>

          <n-collapse v-if="orderDetail.upgrade_snapshot" style="margin-top: 16px">
            <n-collapse-item title="查看核算快照 JSON" name="snapshot">
              <pre class="upgrade-snapshot">{{ formattedUpgradeSnapshot }}</pre>
            </n-collapse-item>
          </n-collapse>
        </template>
        <n-empty v-else-if="!orderDetailLoading" description="暂无订单详情" />
      </n-spin>
    </n-modal>

    <!-- 修改邮箱弹窗 -->
    <n-modal v-model:show="showEmailModal" preset="dialog" title="修改邮箱" positive-text="确认" negative-text="取消" @positive-click="handleConfirmEditEmail">
      <n-space vertical>
        <span>当前邮箱：{{ editingOrder?.email }}</span>
        <n-input v-model:value="newEmail" placeholder="请输入新邮箱" />
      </n-space>
    </n-modal>

    <!-- 新建优惠券弹窗 -->
    <n-modal v-model:show="showCreateCouponModal" preset="dialog" title="新建抵扣券" positive-text="创建并发送" negative-text="取消" :loading="createCouponLoading" @positive-click="handleConfirmCreateCoupon">
      <n-space vertical>
        <p style="color: #999; font-size: 13px;">该订单的抵扣券已过期，可创建新的抵扣券并发送给用户。</p>
        <div>
          <span style="font-size: 13px; margin-bottom: 4px; display: block;">面值（元）</span>
          <n-input-number v-model:value="couponAmount" :min="1" :max="999" :precision="2" style="width: 100%" />
        </div>
        <div>
          <span style="font-size: 13px; margin-bottom: 4px; display: block;">有效期（天）</span>
          <n-input-number v-model:value="couponExpiresDays" :min="1" :max="365" style="width: 100%" />
        </div>
      </n-space>
    </n-modal>

    <!-- 退款确认弹窗 -->
    <n-modal v-model:show="showRefundModal" preset="dialog" type="error" title="确认退款" positive-text="确认退款" negative-text="取消" :loading="refundLoading" @positive-click="handleConfirmRefund">
      <p>
        确定要对订单 <strong>{{ refundOrderRow?.order_no }}</strong> 发起全额退款（<strong>{{ formatSettledAmount(refundOrderRow) }}</strong>）吗？
      </p>
      <p v-if="isHkdOrder(refundOrderRow)" style="color: #999; font-size: 13px;">
        该订单按港币结算，将原路退回 <strong>HK${{ refundOrderRow?.settlement_amount_minor != null ? (refundOrderRow.settlement_amount_minor / 100).toFixed(2) : '0.00' }}</strong>。
      </p>
      <p style="color: #999; font-size: 13px;">退款后将自动禁用激活码并作废抵扣券，此操作不可撤销。</p>
    </n-modal>

    <!-- 修改备注弹窗 -->
    <n-modal v-model:show="showRemarkModal" preset="dialog" title="修改备注" positive-text="保存" negative-text="取消" :loading="remarkSaving" @positive-click="handleConfirmEditRemark">
      <n-space vertical>
        <span style="font-size: 13px; color: #999;">最多500字</span>
        <n-input
          v-model:value="remarkContent"
          type="textarea"
          placeholder="请输入备注内容"
          :rows="4"
          :maxlength="500"
          show-count
        />
      </n-space>
    </n-modal>

    <!-- 优惠券详情弹窗 -->
    <n-modal v-model:show="showCouponDetailModal" preset="card" title="优惠券详情" style="width: 95%; max-width: 850px">
      <n-spin :show="couponDetailLoading">
        <n-data-table
          v-if="couponDetailList.length > 0"
          :columns="couponDetailColumns"
          :data="couponDetailList"
          :bordered="false"
          size="small"
        />
        <n-empty v-else description="暂无优惠券数据" />
      </n-spin>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import {
    createCoupon,
    exportOrders,
    getCouponList,
    getOrderDetail,
    getOrders,
    OrderStatus,
    refundOrder,
    resendCoupon,
    resendEmail,
    type CouponDetail,
    type OrderListParams,
    type OrderRecord,
    updateOrderEmail,
    updateOrderRemark,
} from '@/api/orders'
import { getPackages } from '@/api/packages'
import { createCouponDetailColumns, createOrderColumns, formatAmount, formatTimestamp, formatSettledAmount, isHkdOrder } from './orders/columns'
import { NCard, NCollapseTransition, NDatePicker, NEmpty, NGi, NGrid, NIcon, NInput, NInputNumber, NModal, NSpace, NSpin, useDialog, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const orderList = ref<OrderRecord[]>([])
const showAdvanced = ref(false)

/** 修改邮箱弹窗状态 */
const showEmailModal = ref(false)
const editingOrder = ref<OrderRecord | null>(null)
const newEmail = ref('')
/** 新建优惠券弹窗状态 */
const showCreateCouponModal = ref(false)
const createCouponOrderId = ref<number | null>(null)
/** 新建优惠券默认参数 */
const DEFAULT_COUPON_AMOUNT = 20
const DEFAULT_COUPON_EXPIRES_DAYS = 3
const couponAmount = ref(DEFAULT_COUPON_AMOUNT)
const couponExpiresDays = ref(DEFAULT_COUPON_EXPIRES_DAYS)
const createCouponLoading = ref(false)
/** 重发优惠券防抖锁：防止 dialog 关闭后立即再次点击重发按钮（Naive UI 的 onPositiveClick auto-loading 仅覆盖 dialog 内部） */
const resendingCouponId = ref<number | null>(null)
/** 优惠券详情弹窗状态 */
const showCouponDetailModal = ref(false)
const couponDetailList = ref<CouponDetail[]>([])
const couponDetailLoading = ref(false)
/** 订单详情及换购审计弹窗状态 */
const showOrderDetailModal = ref(false)
const orderDetail = ref<OrderRecord | null>(null)
const orderDetailLoading = ref(false)
const packageOptions = ref<{ label: string; value: number }[]>([])

const upgradeSnapshot = computed<Record<string, any> | null>(() => {
  const raw = orderDetail.value?.upgrade_snapshot
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, any>
  } catch {
    return null
  }
})

const formattedUpgradeSnapshot = computed(() => {
  if (!orderDetail.value?.upgrade_snapshot) return ''
  return upgradeSnapshot.value
    ? JSON.stringify(upgradeSnapshot.value, null, 2)
    : orderDetail.value.upgrade_snapshot
})

/** 筛选参数 */
const filterParams = reactive({
  status: '' as OrderStatus | '',
  orderNo: '',
  tradeNo: '',
  email: '',
  packageId: null as number | null,
  amount: null as number | null,
  activationCode: '',
  paidAtRange: null as [number, number] | null,
  createdAtRange: null as [number, number] | null,
  upgradeOnly: false,
})

/** 分页配置 */
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

/** 状态筛选选项 */
const statusOptions = [
  { label: '待支付', value: OrderStatus.Pending },
  { label: '已支付', value: OrderStatus.Paid },
  { label: '失败', value: OrderStatus.Failed },
  { label: '已过期', value: OrderStatus.Expired },
  { label: '已关闭', value: OrderStatus.Closed },
  { label: '已退款', value: OrderStatus.Refunded },
]

/** 表格列定义（通过工厂函数注入操作回调） */
const columns = createOrderColumns({
  onShowOrderDetail: handleShowOrderDetail,
  onEditEmail: handleEditEmail,
  onResendEmail: handleResendEmail,
  onResendCoupon: handleResendCoupon,
  onShowCouponDetail: handleShowCouponDetail,
  onRefund: handleRefund,
  onEditRemark: handleEditRemark,
  onCopyText: handleCopyText,
})

/** 优惠券详情表格列定义 */
const couponDetailColumns = createCouponDetailColumns(handleCopyText)

/** 日期结束时间补齐到当天 23:59:59.999，确保选同一天也能查到全天数据 */
const END_OF_DAY_MS = 86399999

/** 查看订单与换购审计详情 */
async function handleShowOrderDetail(row: OrderRecord) {
  showOrderDetailModal.value = true
  orderDetailLoading.value = true
  orderDetail.value = null
  try {
    const { data } = await getOrderDetail(row.id)
    orderDetail.value = data || null
  } catch {
    message.error('获取订单详情失败')
  } finally {
    orderDetailLoading.value = false
  }
}

/** 活跃筛选条件数量 */
const activeFilterCount = computed(() => {
  let count = 0
  if (filterParams.status !== '') count++
  if (filterParams.orderNo?.trim()) count++
  if (filterParams.tradeNo?.trim()) count++
  if (filterParams.email?.trim()) count++
  if (filterParams.packageId != null) count++
  if (filterParams.amount != null) count++
  if (filterParams.activationCode?.trim()) count++
  if (filterParams.paidAtRange) count++
  if (filterParams.createdAtRange) count++
  if (filterParams.upgradeOnly) count++
  return count
})

/** 筛选摘要文本（收起时提示用户当前筛选条件） */
const filterSummary = computed(() => {
  if (activeFilterCount.value === 0) return ''
  const parts: string[] = []
  if (filterParams.status !== '') {
    const found = statusOptions.find(o => o.value === filterParams.status)
    if (found) parts.push(`状态: ${found.label}`)
  }
  if (filterParams.orderNo?.trim()) parts.push(`订单号: ${filterParams.orderNo.trim()}`)
  if (filterParams.tradeNo?.trim()) parts.push(`外部订单号: ${filterParams.tradeNo.trim()}`)
  if (filterParams.email?.trim()) parts.push(`邮箱: ${filterParams.email.trim()}`)
  if (filterParams.packageId != null) {
    const found = packageOptions.value.find(o => o.value === filterParams.packageId)
    if (found) parts.push(`套餐: ${found.label}`)
  }
  if (filterParams.amount != null) parts.push(`金额: ¥${filterParams.amount.toFixed(2)}`)
  if (filterParams.activationCode?.trim()) parts.push(`激活码: ${filterParams.activationCode.trim()}`)
  if (filterParams.paidAtRange) parts.push('支付时间已筛选')
  if (filterParams.createdAtRange) parts.push('创建时间已筛选')
  if (filterParams.upgradeOnly) parts.push('仅看换购订单')
  return parts.join(' · ')
})

/** 构建查询参数 */
function buildQueryParams(): OrderListParams {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(filterParams.status !== '' ? { status: filterParams.status } : {}),
    ...(filterParams.orderNo?.trim() ? { orderNo: filterParams.orderNo.trim() } : {}),
    ...(filterParams.tradeNo?.trim() ? { tradeNo: filterParams.tradeNo.trim() } : {}),
    ...(filterParams.email?.trim() ? { email: filterParams.email.trim() } : {}),
    ...(filterParams.packageId != null ? { packageId: filterParams.packageId } : {}),
    ...(filterParams.amount != null ? { amount: filterParams.amount } : {}),
    ...(filterParams.activationCode?.trim() ? { activationCode: filterParams.activationCode.trim() } : {}),
    ...(filterParams.paidAtRange ? { paidAtStart: filterParams.paidAtRange[0], paidAtEnd: filterParams.paidAtRange[1] + END_OF_DAY_MS } : {}),
    ...(filterParams.createdAtRange ? { createdAtStart: filterParams.createdAtRange[0], createdAtEnd: filterParams.createdAtRange[1] + END_OF_DAY_MS } : {}),
    ...(filterParams.upgradeOnly ? { upgrade: 1 as const } : {}),
  }
}

/** 获取订单列表 */
async function fetchOrders() {
  loading.value = true
  try {
    const params = buildQueryParams()
    const { data } = await getOrders(params)
    // 防御空数据：确保 list 始终为数组，total 始终为数字
    orderList.value = Array.isArray(data?.list) ? data.list : []
    pagination.itemCount = data?.total ?? 0
  } catch {
    message.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

/** 查询 */
function handleSearch() {
  pagination.page = 1
  fetchOrders()
}

/** 重置筛选条件 */
function handleReset() {
  filterParams.status = ''
  filterParams.orderNo = ''
  filterParams.tradeNo = ''
  filterParams.email = ''
  filterParams.packageId = null
  filterParams.amount = null
  filterParams.activationCode = ''
  filterParams.paidAtRange = null
  filterParams.createdAtRange = null
  filterParams.upgradeOnly = false
  pagination.page = 1
  fetchOrders()
}

/** 分页变更 */
function handlePageChange(page: number) {
  pagination.page = page
  fetchOrders()
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchOrders()
}

/** 查看优惠券详情 */
async function handleShowCouponDetail(row: OrderRecord) {
  showCouponDetailModal.value = true
  couponDetailLoading.value = true
  couponDetailList.value = []
  try {
    const { data } = await getCouponList(row.id)
    couponDetailList.value = data || []
  } catch {
    message.error('获取优惠券详情失败')
  } finally {
    couponDetailLoading.value = false
  }
}

/** 重发邮件 */
function handleResendEmail(row: OrderRecord) {
  dialog.warning({
    title: '确认操作',
    content: `确定要重发邮件至 ${row.email} 吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await resendEmail(row.id)
        message.success('邮件已重发')
      } catch {
        message.error('重发邮件失败')
      }
    },
  })
}

/** 重发优惠券 */
function handleResendCoupon(row: OrderRecord) {
  // 防抖：如果已有重发操作进行中，忽略快速连点
  if (resendingCouponId.value) return
  // 优惠券已过期，直接弹出新建对话框
  if (row.coupon_expired === 1) {
    createCouponOrderId.value = row.id
    couponAmount.value = DEFAULT_COUPON_AMOUNT
    couponExpiresDays.value = DEFAULT_COUPON_EXPIRES_DAYS
    showCreateCouponModal.value = true
    return
  }
  // 优惠券有效，查询详情后提供选择
  doResendCoupon(row)
}

/** 执行重发优惠券（查询券信息后提供双选项） */
async function doResendCoupon(row: OrderRecord) {
  try {
    const { data: coupons } = await getCouponList(row.id)
    const activeCoupon = (coupons || []).find((c: CouponDetail) => c.status === 'active' && c.expires_at > Date.now())
    if (activeCoupon) {
      const expireDate = new Date(activeCoupon.expires_at)
      const pad = (n: number) => String(n).padStart(2, '0')
      const expireStr = `${expireDate.getFullYear()}-${pad(expireDate.getMonth() + 1)}-${pad(expireDate.getDate())} ${pad(expireDate.getHours())}:${pad(expireDate.getMinutes())}`
      const couponCount = (coupons || []).length
      const warningPrefix = couponCount >= 2 ? `⚠️ 该订单已发放过 ${couponCount} 次优惠券。\n\n` : ''
      dialog.warning({
        title: '重发抵扣券',
        content: `${warningPrefix}当前有效抵扣券：面值 ${activeCoupon.amount} 元，有效期至 ${expireStr}。\n\n请选择操作：`,
        positiveText: '重发当前券邮件',
        negativeText: '废弃并新建',
        onPositiveClick: async () => {
          if (resendingCouponId.value) return
          resendingCouponId.value = row.id
          try {
            await resendCoupon(row.id)
            message.success('抵扣券邮件已重发')
            await fetchOrders()
          } catch (err: any) {
            if (err?.response?.status === 429) {
              message.warning('操作过于频繁，请稍后再试')
            } else {
              message.error('重发抵扣券邮件失败')
            }
          } finally {
            resendingCouponId.value = null
          }
        },
        onNegativeClick: () => {
          // 弹出新建抵扣券对话框，默认面值继承原券
          createCouponOrderId.value = row.id
          couponAmount.value = activeCoupon.amount
          couponExpiresDays.value = DEFAULT_COUPON_EXPIRES_DAYS
          showCreateCouponModal.value = true
        },
      })
    } else {
      // 找不到有效券，弹新建对话框
      createCouponOrderId.value = row.id
      couponAmount.value = DEFAULT_COUPON_AMOUNT
      couponExpiresDays.value = DEFAULT_COUPON_EXPIRES_DAYS
      showCreateCouponModal.value = true
    }
  } catch {
    message.error('获取优惠券信息失败')
  }
}

/** 确认创建新优惠券并发送 */
async function handleConfirmCreateCoupon(): Promise<boolean> {
  if (!createCouponOrderId.value) return false
  if (couponAmount.value <= 0 || couponExpiresDays.value <= 0) {
    message.error('面值和有效期必须大于0')
    return false
  }
  createCouponLoading.value = true
  try {
    const { data } = await createCoupon(createCouponOrderId.value, couponAmount.value, couponExpiresDays.value)
    if (data?.warning) {
      message.warning(data.warning)
    } else {
      message.success('新优惠券已创建并发送邮件')
    }
    await fetchOrders()
    return true
  } catch {
    message.error('创建优惠券失败')
    return false
  } finally {
    createCouponLoading.value = false
  }
}

/** 打开修改邮箱弹窗 */
function handleEditEmail(row: OrderRecord) {
  editingOrder.value = row
  newEmail.value = ''
  showEmailModal.value = true
}

/** 确认修改邮箱 */
async function handleConfirmEditEmail(): Promise<boolean> {
  if (!editingOrder.value || !newEmail.value.trim()) {
    message.error('请输入新邮箱')
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail.value.trim())) {
    message.error('邮箱格式不正确')
    return false
  }
  try {
    await updateOrderEmail(editingOrder.value.id, newEmail.value.trim())
    message.success('邮箱修改成功')
    fetchOrders()
    return true
  } catch {
    message.error('修改邮箱失败')
    return false
  }
}

/** 导出订单 CSV */
async function handleExport() {
  try {
    const params = buildQueryParams()
    const { data } = await exportOrders(params)
    // 创建 Blob 并触发下载
    const blob = new Blob([data as BlobPart], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch {
    message.error('导出失败')
  }
}

async function handleCopyText(text: string, label: string) {
  if (!text) return
  try {
    await copyText(text)
    message.success(`${label}已复制`)
  } catch {
    message.error('复制失败，请手动选择复制')
  }
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy failed')
}

/** 退款弹窗状态 */
const showRefundModal = ref(false)
const refundOrderRow = ref<OrderRecord | null>(null)
const refundLoading = ref(false)

/** 退款 */
function handleRefund(row: OrderRecord) {
  refundOrderRow.value = row
  refundLoading.value = false
  showRefundModal.value = true
}

/** 确认退款 */
async function handleConfirmRefund(): Promise<boolean> {
  if (!refundOrderRow.value) return false
  refundLoading.value = true
  try {
    const { data } = await refundOrder(refundOrderRow.value.id)
    if (data?.success) {
      message.success(data.message || '退款成功')
      fetchOrders()
      return true
    } else {
      message.error(data?.message || '退款失败')
      return false
    }
  } catch (err: any) {
    const errMsg = err?.response?.data?.message || '退款失败'
    message.error(errMsg)
    return false
  } finally {
    refundLoading.value = false
  }
}

/** 备注编辑弹窗状态 */
const showRemarkModal = ref(false)
const remarkOrderId = ref<number | null>(null)
const remarkContent = ref('')
const remarkSaving = ref(false)

/** 打开备注编辑弹窗 */
function handleEditRemark(row: OrderRecord) {
  remarkOrderId.value = row.id
  remarkContent.value = row.admin_remark || ''
  showRemarkModal.value = true
}

/** 确认修改备注 */
async function handleConfirmEditRemark(): Promise<boolean> {
  if (remarkOrderId.value === null) return false
  if (remarkContent.value.length > 500) {
    message.error('备注内容不能超过500字')
    return false
  }
  remarkSaving.value = true
  try {
    await updateOrderRemark(remarkOrderId.value, remarkContent.value)
    message.success('备注修改成功')
    fetchOrders()
    return true
  } catch {
    message.error('修改备注失败')
    return false
  } finally {
    remarkSaving.value = false
  }
}

/** 加载套餐选项 */
async function loadPackageOptions() {
  try {
    const { data } = await getPackages()
    if (Array.isArray(data)) {
      packageOptions.value = data.map((p) => ({ label: p.name, value: p.id }))
    }
  } catch { /* 静默失败，不影响主功能 */ }
}

onMounted(() => {
  fetchOrders()
  loadPackageOptions()
})
</script>

<style scoped>
.filter-label {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
}
.filter-summary {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.copyable-table-cell) {
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #18a058;
  cursor: pointer;
  vertical-align: bottom;
}

:deep(.copyable-table-cell:hover) {
  text-decoration: underline;
}

/* 港币结算的实收金额：用 Stripe 品牌紫区分币种，避免与人民币标价混淆 */
.settled-hkd {
  color: #635bff;
}

.upgrade-amount {
  color: #18a058;
}

.upgrade-snapshot {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
