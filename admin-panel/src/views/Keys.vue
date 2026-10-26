<template>
  <div>
    <n-space vertical :size="16">
      <!-- 当前活跃密钥 -->
      <n-card title="当前密钥">
        <template #header-extra>
          <n-button type="primary" @click="handleGenerate">生成新密钥对</n-button>
        </template>

        <n-spin :show="loading">
          <template v-if="activeKey">
            <n-descriptions :column="2" bordered>
              <n-descriptions-item label="版本号">{{ activeKey.version }}</n-descriptions-item>
              <n-descriptions-item label="算法">{{ activeKey.algorithm }}</n-descriptions-item>
              <n-descriptions-item label="指纹">
                <n-text code>{{ activeKey.fingerprint }}</n-text>
              </n-descriptions-item>
              <n-descriptions-item label="状态">
                <n-tag :type="statusTagType(activeKey.status)" size="small">
                  {{ statusLabel(activeKey.status) }}
                </n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="创建时间" :span="2">{{ formatTimestamp(activeKey.created_at) }}</n-descriptions-item>
              <n-descriptions-item label="公钥" :span="2">
                <n-input
                  type="textarea"
                  :value="activeKey.public_key"
                  readonly
                  :autosize="{ minRows: 3, maxRows: 8 }"
                />
              </n-descriptions-item>
            </n-descriptions>
          </template>
          <n-empty v-else description="暂无活跃密钥" />
        </n-spin>
      </n-card>

      <!-- 历史密钥列表 -->
      <n-card title="历史密钥">
        <n-data-table
          :columns="historyColumns"
          :data="historyKeys"
          :bordered="false"
          size="small"
          :scroll-x="720"
        />
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useMessage, useDialog, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { getKeys, generateKey, type KeyRecord, type KeyStatus } from '@/api/keys'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const keys = ref<KeyRecord[]>([])

/** 当前活跃密钥 */
const activeKey = computed(() => keys.value.find((k) => k.status === 'active') || null)

/** 历史（grace/retired）密钥 */
const historyKeys = computed(() => keys.value.filter((k) => k.status !== 'active'))

/** 状态标签类型映射 */
function statusTagType(status: KeyStatus): 'success' | 'warning' | 'default' {
  const map: Record<KeyStatus, 'success' | 'warning' | 'default'> = {
    active: 'success',
    grace: 'warning',
    retired: 'default',
  }
  return map[status]
}

/** 状态标签文本映射 */
function statusLabel(status: KeyStatus): string {
  const map: Record<KeyStatus, string> = {
    active: '活跃',
    grace: '宽限期',
    retired: '已退役',
  }
  return map[status]
}

/** 格式化时间戳为可读时间 */
function formatTimestamp(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const date = new Date(typeof ts === 'number' ? ts : Number(ts))
  if (isNaN(date.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 历史密钥表格列 */
const historyColumns: DataTableColumns<KeyRecord> = [
  { title: '版本号', key: 'version', width: 80 },
  { title: '算法', key: 'algorithm', width: 100 },
  { title: '指纹', key: 'fingerprint', width: 260, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: statusTagType(row.status), size: 'small' }, { default: () => statusLabel(row.status) }),
  },
  {
    title: '创建时间',
    key: 'created_at',
    width: 180,
    render: (row) => formatTimestamp(row.created_at),
  },
]

/** 获取密钥列表 */
async function fetchKeys() {
  loading.value = true
  try {
    const { data } = await getKeys()
    // 防御空数据：确保 keys.value 始终为数组，避免 find/filter 崩溃
    keys.value = Array.isArray(data) ? data : []
  } catch {
    message.error('获取密钥列表失败')
  } finally {
    loading.value = false
  }
}

/** 生成新密钥对 */
function handleGenerate() {
  dialog.warning({
    title: '确认生成',
    content: '生成新密钥对后，当前活跃密钥将进入宽限期。确定要继续吗？',
    positiveText: '确认生成',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await generateKey()
        message.success('新密钥对生成成功')
        fetchKeys()
      } catch {
        message.error('生成密钥对失败')
      }
    },
  })
}

onMounted(fetchKeys)
</script>

<style scoped>
@media (max-width: 767px) {
  :deep(.n-descriptions-table-wrapper) {
    overflow-x: auto;
  }
  :deep(.n-descriptions-table) {
    min-width: 480px;
  }
}
</style>
