<template>
  <n-modal
    :show="show"
    preset="dialog"
    title="绑定设备详情"
    :show-icon="false"
    style="width: 95%; max-width: 940px"
    @update:show="handleUpdateShow"
  >
    <n-spin :show="devicesLoading">
      <n-data-table
        :columns="deviceColumns"
        :data="deviceList"
        :bordered="false"
        size="small"
        :pagination="false"
        :scroll-x="880"
      />
    </n-spin>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NSpin, NDataTable, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getCodeDevices, type DeviceRecord } from '@/api/codes'
import { formatTimestamp } from '../utils'

const props = defineProps<{
  show: boolean
  codeId?: number | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const message = useMessage()

const devicesLoading = ref(false)
const deviceList = ref<DeviceRecord[]>([])

/** 设备详情表格列定义 */
const deviceColumns: DataTableColumns<DeviceRecord> = [
  { title: '设备名称', key: 'hostname', width: 120, render: (row) => row.hostname || '-' },
  { title: '操作系统', key: 'os_type', width: 90, render: (row) => row.os_type || '-' },
  { title: '客户端版本', key: 'client_version', width: 110, render: (row) => row.client_version || '-' },
  {
    title: '设备指纹',
    key: 'device_fingerprint',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row) => {
      // 脱敏显示：前8位...后4位
      const fp = row.device_fingerprint
      if (fp && fp.length > 12) return `${fp.slice(0, 8)}...${fp.slice(-4)}`
      return fp || '-'
    },
  },
  {
    title: '首次激活',
    key: 'first_seen_at',
    width: 170,
    ellipsis: { tooltip: true },
    render: (row) => formatTimestamp(row.first_seen_at),
  },
  {
    title: '最后检查',
    key: 'last_check_at',
    width: 170,
    ellipsis: { tooltip: true },
    render: (row) => formatTimestamp(row.last_check_at),
  },
]

function handleUpdateShow(val: boolean) {
  emit('update:show', val)
}

async function loadDevices(id: number) {
  devicesLoading.value = true
  deviceList.value = []
  try {
    const { data } = await getCodeDevices(id)
    deviceList.value = Array.isArray(data) ? data : []
  } catch {
    message.error('获取设备列表失败')
  } finally {
    devicesLoading.value = false
  }
}

watch(
  () => [props.show, props.codeId] as const,
  ([show, codeId]) => {
    if (show && typeof codeId === 'number') {
      loadDevices(codeId)
    } else if (!show) {
      deviceList.value = []
    }
  },
  { immediate: true },
)
</script>
