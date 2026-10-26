import { h } from 'vue'
import { NButton, NTag, NSpace, NTooltip, NIcon } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import { CodeStatus, type CodeRecord } from '@/api/codes'
import { formatProductName } from '@/utils/product'
import {
  formatTimestamp,
  getCodeExpiresAt,
  isCodeExpired,
  DURATION_TYPE_PERMANENT,
} from './utils'

/** 状态标签映射 */
export const statusTagMap: Record<CodeStatus, { type: 'success' | 'warning' | 'error'; label: string }> = {
  [CodeStatus.Unused]: { type: 'warning', label: '未使用' },
  [CodeStatus.Activated]: { type: 'success', label: '已激活' },
  [CodeStatus.Disabled]: { type: 'error', label: '已禁用' },
}

/** 渲染到期状态标签 */
export function renderExpirationTag(row: CodeRecord) {
  if (!row.activated_at) {
    return h(NTag, { size: 'small' }, { default: () => '未激活' })
  }
  if (row.duration_type === DURATION_TYPE_PERMANENT) {
    return h(NTag, { type: 'success', size: 'small' }, { default: () => '永久' })
  }
  const expired = isCodeExpired(row)
  return h(
    NTag,
    { type: expired ? 'error' : 'success', size: 'small' },
    { default: () => (expired ? '已过期' : '未过期') },
  )
}

export interface CodeColumnHandlers {
  onCopyCode: (code: string) => void
  onEditNote: (row: CodeRecord) => void
  onToggleStatus: (row: CodeRecord) => void
  onViewDevices: (row: CodeRecord) => void
}

/** 生成激活码表格列配置 */
export function createCodeColumns(handlers: CodeColumnHandlers): DataTableColumns<CodeRecord> {
  return [
    {
      title: '产品',
      key: 'product',
      width: 150,
      render: (row) => formatProductName(row.product),
    },
    {
      title: '激活码',
      key: 'code',
      width: 260,
      render: (row) => {
        const code = row.code || '-'
        return h(
          NTooltip,
          {},
          {
            trigger: () =>
              h(
                'span',
                {
                  class: 'activation-code-cell',
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation()
                    handlers.onCopyCode(code)
                  },
                },
                code,
              ),
            default: () => '点击复制激活码',
          },
        )
      },
    },
    { title: '套餐', key: 'package_name', width: 120 },
    { title: '渠道', key: 'channel_name', width: 100 },
    {
      title: '备注',
      key: 'manual_note',
      width: 180,
      render: (row) => {
        const manual = (row.manual_note || '').trim()
        const batch = (row.batch_note || '').trim()
        const hasManual = manual !== ''
        const hasBatch = batch !== ''

        let tooltipContent = ''
        if (hasManual && hasBatch && manual !== batch) {
          tooltipContent = `【人工备注】\n${manual}\n\n【批次/系统记录】\n${batch}`
        } else if (hasManual) {
          tooltipContent = manual
        } else if (hasBatch) {
          tooltipContent = `【批次/系统记录】\n${batch}`
        } else {
          tooltipContent = '点击添加备注'
        }

        const displayText = hasManual ? manual : hasBatch ? batch : '-'
        const textClass = !hasManual && !hasBatch
          ? 'note-cell-text is-empty'
          : !hasManual
            ? 'note-cell-text is-batch'
            : 'note-cell-text'

        return h(
          'div',
          {
            class: 'note-cell-wrapper',
            onClick: () => handlers.onEditNote(row),
          },
          [
            h(
              NTooltip,
              {},
              {
                trigger: () =>
                  h(
                    'span',
                    { class: textClass },
                    displayText,
                  ),
                default: () =>
                  h(
                    'div',
                    { style: 'white-space: pre-wrap; word-break: break-word; max-width: 320px;' },
                    tooltipContent,
                  ),
              },
            ),
            h(
              NButton,
              {
                quaternary: true,
                circle: true,
                size: 'tiny',
                class: 'edit-note-btn',
                title: '修改备注',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation()
                  handlers.onEditNote(row)
                },
              },
              {
                icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
              },
            ),
          ],
        )
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (row) => {
        const tag = statusTagMap[row.status]
        return h(NTag, { type: tag.type, size: 'small' }, { default: () => tag.label })
      },
    },
    {
      title: '是否过期',
      key: 'is_expired',
      width: 100,
      render: (row) => renderExpirationTag(row),
    },
    {
      title: '到期时间',
      key: 'expires_at',
      width: 180,
      render: (row) => {
        const expiresAt = getCodeExpiresAt(row)
        if (!row.activated_at) return '-'
        if (row.duration_type === DURATION_TYPE_PERMANENT || !expiresAt) return '永久'
        return h(
          'span',
          { class: isCodeExpired(row) ? 'expired-time-cell' : '' },
          formatTimestamp(expiresAt),
        )
      },
    },
    { title: '已激活设备数', key: 'device_count', width: 120 },
    {
      title: '剩余可激活',
      key: 'remaining_devices',
      width: 120,
      render: (row) => {
        const remaining = row.max_devices - row.device_count
        const type = remaining <= 0 ? 'error' : remaining === 1 ? 'warning' : 'success'
        return h(NTag, { type, size: 'small' }, { default: () => `${remaining} / ${row.max_devices}` })
      },
    },
    {
      title: '创建时间',
      key: 'created_at',
      width: 180,
      render: (row) => formatTimestamp(row.created_at),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (row) => {
        const buttons: ReturnType<typeof h>[] = []
        if (row.status === CodeStatus.Disabled) {
          buttons.push(
            h(
              NButton,
              { size: 'small', type: 'warning', onClick: () => handlers.onToggleStatus(row) },
              { default: () => '启用' },
            ),
          )
        } else if (row.status === CodeStatus.Activated) {
          buttons.push(
            h(
              NButton,
              { size: 'small', type: 'error', onClick: () => handlers.onToggleStatus(row) },
              { default: () => '禁用' },
            ),
          )
        } else if (row.status === CodeStatus.Unused) {
          buttons.push(
            h(
              NButton,
              { size: 'small', type: 'error', onClick: () => handlers.onToggleStatus(row) },
              { default: () => '禁用' },
            ),
          )
        }
        // 已激活且有设备 → 显示“查看设备”按钮
        if (row.status === CodeStatus.Activated && row.device_count > 0) {
          buttons.push(
            h(
              NButton,
              { size: 'small', type: 'info', onClick: () => handlers.onViewDevices(row) },
              { default: () => '查看设备' },
            ),
          )
        }
        return buttons.length > 0 ? h(NSpace, { size: 'small' }, { default: () => buttons }) : '-'
      },
    },
  ]
}
