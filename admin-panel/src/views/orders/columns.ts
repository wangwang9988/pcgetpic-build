
import { h, type VNode } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NTag, NTooltip } from 'naive-ui'
import { OrderStatus, type CouponDetail, type OrderRecord } from '@/api/orders'
import { paymentChannelMap } from './paymentChannels'
import { formatProductName } from '@/utils/product'

/** 格式化金额 */
export function formatAmount(amount: number) {
  return `¥${amount.toFixed(2)}`
}

/** 港币分转 HK$ 展示（不带币种符号，便于与「实收」并列展示）。 */
export function formatHkdMinor(minor: number): string {
  return (minor / 100).toFixed(2)
}

/** 该订单是否为港币结算。 */
export function isHkdOrder(order: Pick<OrderRecord, 'settlement_currency'> | null | undefined): boolean {
  return order?.settlement_currency === 'hkd'
}

/**
 * 按订单的实际结算币种格式化「实收」金额。
 *
 * orders.amount 永远是人民币标价（这是下单时的定价口径），港币订单的钱实际
 * 走的是 settlement_amount_minor（港币分）。只显示 ¥ 会让运营以为退款要退
 * 人民币标价，而实际原路退回的是港币——所以这里必须按币种分流。
 */
export function formatSettledAmount(
  order: Pick<OrderRecord, 'amount' | 'settlement_currency' | 'settlement_amount_minor'> | null | undefined,
): string {
  if (isHkdOrder(order) && typeof order?.settlement_amount_minor === 'number') {
    return `HK$${formatHkdMinor(order.settlement_amount_minor)}`
  }
  return formatAmount(order?.amount ?? 0)
}

/** 格式化时间戳为可读时间 */
export function formatTimestamp(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const date = new Date(typeof ts === 'number' ? ts : Number(ts))
  if (isNaN(date.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 状态标签映射：颜色 + 中文标签 */
const statusTagMap: Record<OrderStatus, { type: 'info' | 'success' | 'error' | 'default'; label: string }> = {
  [OrderStatus.Pending]: { type: 'info', label: '待支付' },
  [OrderStatus.Paid]: { type: 'success', label: '已支付' },
  [OrderStatus.Failed]: { type: 'error', label: '失败' },
  [OrderStatus.Expired]: { type: 'default', label: '已过期' },
  [OrderStatus.Closed]: { type: 'default', label: '已关闭' },
  [OrderStatus.Refunded]: { type: 'default', label: '已退款' },
}

function renderCopyableText(
  value: string | null | undefined,
  label: string,
  onCopyText: (text: string, label: string) => void,
): VNode {
  const text = value || ''
  if (!text) return h('span', { style: { color: '#999' } }, '-')

  return h(
    NTooltip,
    {},
    {
      trigger: () =>
        h(
          'span',
          {
            class: 'copyable-table-cell',
            onClick: (e: Event) => {
              e.stopPropagation()
              onCopyText(text, label)
            },
          },
          text,
        ),
      default: () => `点击复制${label}`,
    },
  )
}

/**
 * 创建订单列表的列定义
 *
 * @param handlers 操作回调集合，避免列定义直接依赖页面状态
 */
export function createOrderColumns(handlers: {
  onShowOrderDetail: (row: OrderRecord) => void
  onEditEmail: (row: OrderRecord) => void
  onResendEmail: (row: OrderRecord) => void
  onResendCoupon: (row: OrderRecord) => void
  onShowCouponDetail: (row: OrderRecord) => void
  onRefund: (row: OrderRecord) => void
  onEditRemark: (row: OrderRecord) => void
  onCopyText: (text: string, label: string) => void
}): DataTableColumns<OrderRecord> {
  return [
    { title: '产品', key: 'product', width: 150, render: (row) => formatProductName(row.product) },
    {
      title: '订单号',
      key: 'order_no',
      width: 200,
      render: (row) => renderCopyableText(row.order_no, '订单号', handlers.onCopyText),
    },
    {
      title: '支付渠道',
      key: 'payment_channel',
      width: 130,
      render: (row) => {
        if (!row.payment_channel) return '-'
        const ch = paymentChannelMap[row.payment_channel]
        if (ch) {
          return h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: ch.color, fontWeight: 500 } },
            [ch.icon, ch.label]
          )
        }
        return h('span', { style: { color: '#999' } }, row.payment_channel)
      },
    },
    {
      title: '外部订单号',
      key: 'trade_no',
      width: 220,
      render: (row) => renderCopyableText(row.trade_no, '外部订单号', handlers.onCopyText),
    },
    {
      title: '邮箱',
      key: 'email',
      width: 260,
      render: (row) => {
        const elements: VNode[] = [renderCopyableText(row.email, '邮箱', handlers.onCopyText)]
        if (row.is_email_modified === 1) {
          elements.push(
            h(
              NTooltip,
              {},
              {
                trigger: () => h(NTag, { size: 'small', type: 'warning', bordered: false, style: 'margin-left: 6px' }, { default: () => '已修改' }),
                default: () => `原始邮箱: ${row.original_email || '未知'}`,
              }
            )
          )
        }
        if (row.status === OrderStatus.Paid) {
          elements.push(
            h(
              NButton,
              {
                size: 'tiny',
                quaternary: true,
                type: 'default',
                style: 'margin-left: 4px; padding: 0 4px; font-size: 12px; min-height: 20px;',
                onClick: (e: Event) => { e.stopPropagation(); handlers.onEditEmail(row) },
              },
              { default: () => '✎' }
            )
          )
        }
        return h('span', { style: { display: 'inline-flex', alignItems: 'center', maxWidth: '100%', minWidth: '0' } }, elements)
      },
    },
    { title: '套餐', key: 'package_name', width: 120 },
    {
      title: '金额',
      key: 'amount',
      width: 130,
      render: (row) => {
        // 港币订单同时展示人民币标价与港币实收：标价只是展示口径，
        // 真正收到的钱是结算币种那一份，混算会让营收判断出错。
        if (isHkdOrder(row) && row.settlement_amount_minor != null) {
          return h('div', {}, [
            formatAmount(row.amount),
            h(
              'div',
              { style: { color: '#635BFF', fontSize: '12px', marginTop: '2px' } },
              `实收 HK$ ${formatHkdMinor(row.settlement_amount_minor)}`
            ),
          ])
        }
        return formatAmount(row.amount)
      },
    },
    {
      title: '换购',
      key: 'upgrade_discount',
      width: 165,
      render: (row) => {
        if (row.upgrade_discount == null) return h('span', { style: { color: '#999' } }, '-')
        let floorApplied = false
        try {
          floorApplied = Boolean(row.upgrade_snapshot && JSON.parse(row.upgrade_snapshot).floor_applied)
        }
        catch { /* 历史异常快照只影响标签，不影响订单数据 */ }
        const label = `当图换购 −${formatAmount(row.upgrade_discount)}${floorApplied ? ' · 保底' : ''}`
        return h(
          NTooltip,
          {},
          {
            trigger: () => h(
              NTag,
              { type: floorApplied ? 'warning' : 'success', size: 'small', bordered: false },
              { default: () => label },
            ),
            default: () => `来源：${row.upgrade_source_input || row.upgrade_source_order_no || '-'}；旧码：${row.upgrade_source_code || '-'}${row.upgrade_source_code_status === 2 ? '（已禁用）' : ''}`,
          },
        )
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (row) => {
        const tag = statusTagMap[row.status as OrderStatus] || { type: 'default' as const, label: row.status }
        return h(NTag, { type: tag.type, size: 'small' }, { default: () => tag.label })
      },
    },
    {
      title: '激活码',
      key: 'activation_code',
      width: 180,
      render: (row) => renderCopyableText(row.activation_code, '激活码', handlers.onCopyText),
    },
    {
      title: '优惠券',
      key: 'coupon_info',
      width: 140,
      render: (row) => {
        const count = row.coupon_count || 0
        if (count === 0) return '-'

        const status = row.latest_coupon_status
        const hasCoupon = row.has_coupon === 1

        let tagType: 'success' | 'error' | 'default' = 'default'
        let tagLabel = '未知'

        if (status === 'used') {
          tagType = 'default'
          tagLabel = '已使用'
        } else if (hasCoupon) {
          tagType = 'success'
          tagLabel = '有效'
        } else {
          tagType = 'error'
          tagLabel = '已过期'
        }

        return h(
          NTooltip,
          {},
          {
            trigger: () => h(
              'span',
              {
                style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
                onClick: (e: Event) => { e.stopPropagation(); handlers.onShowCouponDetail(row) },
              },
              [
                h(NTag, { type: tagType, size: 'small', bordered: false }, { default: () => tagLabel }),
                h('span', { style: { fontSize: '12px', color: '#999', marginLeft: '4px' } }, `(共${count}次)`),
              ]
            ),
            default: () => '点击查看优惠券发放明细',
          }
        )
      },
    },
    {
      title: '支付时间',
      key: 'paid_at',
      width: 180,
      render: (row) => formatTimestamp(row.paid_at),
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 180,
      render: (row) => formatTimestamp(row.created_at),
    },
    {
      title: '备注',
      key: 'admin_remark',
      width: 150,
      render: (row) => {
        const remark = row.admin_remark || ''
        const editBtn = h(
          NButton,
          {
            size: 'tiny',
            quaternary: true,
            type: 'default',
            style: 'margin-left: 4px; padding: 0 4px; font-size: 12px; min-height: 20px; flex-shrink: 0;',
            onClick: (e: Event) => { e.stopPropagation(); handlers.onEditRemark(row) },
          },
          { default: () => '✎' }
        )
        if (!remark) {
          return h('span', { style: { display: 'inline-flex', alignItems: 'center', minWidth: '0' } }, [
            h('span', { style: { color: '#999' } }, '-'),
            editBtn,
          ])
        }
        return h(
          NTooltip,
          {},
          {
            trigger: () => h('span', { style: { display: 'inline-flex', alignItems: 'center', minWidth: '0' } }, [
              h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' } }, remark),
              editBtn,
            ]),
            default: () => remark,
          }
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 330,
      fixed: 'right',
      render: (row) => {
        const detailButton = h(
          NButton,
          {
            size: 'small',
            type: 'info',
            secondary: true,
            onClick: () => handlers.onShowOrderDetail(row),
          },
          { default: () => '详情' },
        )
        if (row.status === OrderStatus.Paid) {
          const isCouponExpired = row.coupon_expired === 1
          const isCodeExpired = row.code_expired === 1
          const showCouponBtn = (row.has_coupon === 1 || row.coupon_expired === 1) && row.latest_coupon_status !== 'used'
          const buttons = [
            detailButton,
            h(
              NButton,
              { size: 'small', type: (isCodeExpired || isCouponExpired) ? 'error' : 'primary', onClick: () => handlers.onResendEmail(row) },
              { default: () => '重发邮件' },
            ),
          ]
          if (showCouponBtn) {
            buttons.push(
              h(
                NButton,
                { size: 'small', type: isCouponExpired ? 'error' : 'warning', onClick: () => handlers.onResendCoupon(row) },
                { default: () => '重发优惠券' },
              )
            )
          } else {
            // 占位：渲染一个与「重发优惠券」按钮完全相同的不可见按钮，确保退款按钮纵向对齐
            buttons.push(
              h(
                NButton,
                { size: 'small', type: 'default', style: 'visibility: hidden; pointer-events: none;' },
                { default: () => '重发优惠券' },
              )
            )
          }
          buttons.push(
            h(
              NButton,
              { size: 'small', type: 'error', onClick: () => handlers.onRefund(row) },
              { default: () => '退款' },
            )
          )
          return h('div', { style: { display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '8px' } }, buttons)
        }
        return detailButton
      },
    },
  ]
}

/** 优惠券状态标签映射：区分"自然过期"和"管理员作废" */
const couponStatusMap: Record<string, { type: 'success' | 'error' | 'default' | 'warning'; label: string }> = {
  active: { type: 'success', label: '有效' },
  used: { type: 'default', label: '已使用' },
}

/** 创建优惠券详情表格列定义 */
export function createCouponDetailColumns(
  onCopyText: (text: string, label: string) => void,
): DataTableColumns<CouponDetail> {
  return [
    {
      title: '券码',
      key: 'code',
      width: 140,
      ellipsis: { tooltip: true },
      render: (row: CouponDetail) => renderCopyableText(row.code, '券码', onCopyText),
    },
    { title: '面值', key: 'amount', width: 60, render: (row: CouponDetail) => `¥${row.amount}` },
    {
      title: '状态',
      key: 'status',
      width: 70,
      render: (row: CouponDetail) => {
        // revoked=1 表示券未超期但被标记为 expired（管理员作废）
        if (row.status === 'expired' && row.revoked === 1) {
          return h(NTag, { type: 'warning', size: 'small', bordered: false }, { default: () => '已作废' })
        }
        const info = couponStatusMap[row.status] ?? { type: 'error' as const, label: '已过期' }
        return h(NTag, { type: info.type, size: 'small', bordered: false }, { default: () => info.label })
      },
    },
    { title: '创建时间', key: 'created_at', width: 140, render: (row: CouponDetail) => formatTimestamp(row.created_at) },
    { title: '过期时间', key: 'expires_at', width: 140, render: (row: CouponDetail) => formatTimestamp(row.expires_at) },
    { title: '使用订单', key: 'used_order_no', width: 220, render: (row: CouponDetail) => renderCopyableText(row.used_order_no, '使用订单', onCopyText) },
  ]
}
