<template>
  <div>
    <!-- 顶部操作栏 -->
    <n-space style="margin-bottom: 16px" :wrap="true" align="center">
      <n-button type="primary" @click="showGenerateModal = true">批量生成</n-button>
      <n-button @click="handleExport">导出 CSV</n-button>
      <n-select
        v-model:value="filterStatus"
        :options="statusOptions"
        placeholder="状态筛选"
        style="width: 140px"
        clearable
        @update:value="handleFilterChange"
      />
      <n-input
        v-model:value="filterKeyword"
        placeholder="搜索激活码 / 备注"
        style="width: 220px"
        clearable
        @keydown.enter="handleSearch"
        @clear="handleClearSearch"
      >
        <template #prefix>
          <n-icon :component="SearchOutline" />
        </template>
      </n-input>
      <n-button @click="handleSearch">搜索</n-button>
    </n-space>

    <!-- 数据表格 -->
    <n-data-table
      :columns="columns"
      :data="codeList"
      :loading="loading"
      :pagination="pagination"
      :scroll-x="1790"
      :row-key="(row: CodeRecord) => row.id"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />

    <!-- 批量生成对话框 -->
    <GenerateCodeModal
      v-model:show="showGenerateModal"
      @success="fetchCodes"
    />

    <!-- 绑定设备详情对话框 -->
    <DeviceListModal
      v-model:show="showDevicesModal"
      :code-id="currentViewingCodeId"
    />

    <!-- 修改激活码备注对话框 -->
    <EditNoteModal
      v-model:show="showNoteModal"
      :code-record="currentEditingCode"
      @success="handleNoteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import {
  NSpace,
  NButton,
  NSelect,
  NInput,
  NIcon,
  NDataTable,
  useMessage,
  useDialog,
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import {
  getCodes,
  updateCodeStatus,
  exportCodes,
  CodeStatus,
  type CodeStatusAction,
  type CodeRecord,
} from '@/api/codes'
import { createCodeColumns } from './codes/columns'
import { copyText } from './codes/utils'
import GenerateCodeModal from './codes/components/GenerateCodeModal.vue'
import DeviceListModal from './codes/components/DeviceListModal.vue'
import EditNoteModal from './codes/components/EditNoteModal.vue'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const codeList = ref<CodeRecord[]>([])
const filterStatus = ref<CodeStatus | ''>('')
const filterKeyword = ref('')

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
  { label: '未使用', value: CodeStatus.Unused },
  { label: '已激活', value: CodeStatus.Activated },
  { label: '已禁用', value: CodeStatus.Disabled },
]

/** 弹窗状态控制 */
const showGenerateModal = ref(false)

const showDevicesModal = ref(false)
const currentViewingCodeId = ref<number | null>(null)

const showNoteModal = ref(false)
const currentEditingCode = ref<CodeRecord | null>(null)

/** 表格列定义与回调 */
const columns = createCodeColumns({
  onCopyCode: handleCopyCode,
  onEditNote: openEditNoteModal,
  onToggleStatus: handleToggleStatus,
  onViewDevices: handleViewDevices,
})

function openEditNoteModal(row: CodeRecord) {
  currentEditingCode.value = row
  showNoteModal.value = true
}

function handleNoteSuccess(payload: { id: number; manual_note: string }) {
  const target = codeList.value.find((c) => c.id === payload.id)
  if (target) {
    target.manual_note = payload.manual_note
  }
}

function handleViewDevices(row: CodeRecord) {
  currentViewingCodeId.value = row.id
  showDevicesModal.value = true
}

/** 复制激活码 */
async function handleCopyCode(code: string) {
  if (!code || code === '-') return
  try {
    await copyText(code)
    message.success('激活码已复制')
  } catch {
    message.error('复制失败，请手动选择复制')
  }
}

/** 获取激活码列表 */
async function fetchCodes() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filterStatus.value !== '') {
      params.status = filterStatus.value
    }
    if (filterKeyword.value.trim()) {
      params.keyword = filterKeyword.value.trim()
    }
    const { data } = await getCodes(params as Parameters<typeof getCodes>[0])
    codeList.value = Array.isArray(data?.list) ? data.list : []
    pagination.itemCount = data?.total ?? 0
  } catch {
    message.error('获取激活码列表失败')
  } finally {
    loading.value = false
  }
}

/** 筛选与搜索 */
function handleSearch() {
  pagination.page = 1
  fetchCodes()
}

function handleClearSearch() {
  filterKeyword.value = ''
  pagination.page = 1
  fetchCodes()
}

function handleFilterChange() {
  pagination.page = 1
  fetchCodes()
}

function handlePageChange(page: number) {
  pagination.page = page
  fetchCodes()
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchCodes()
}

/** 切换激活码状态（禁用/启用） */
function handleToggleStatus(row: CodeRecord) {
  const action: CodeStatusAction = row.status === CodeStatus.Disabled ? 'enable' : 'disable'
  const actionText = action === 'enable' ? '启用' : '禁用'
  const enableHint = row.activated_at ? '（将恢复为已激活状态，到期时间不变）' : '（将恢复为未使用状态）'

  dialog.warning({
    title: '确认操作',
    content: `确定要${actionText}激活码 ${row.code} 吗？${action === 'enable' ? enableHint : ''}`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await updateCodeStatus(row.id, action)
        message.success(`${actionText}成功`)
        fetchCodes()
      } catch {
        message.error(`${actionText}失败`)
      }
    },
  })
}

/** 导出 CSV */
async function handleExport() {
  try {
    const { data } = await exportCodes(filterStatus.value, filterKeyword.value)
    const blob = new Blob([data as BlobPart], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `激活码导出_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch {
    message.error('导出失败')
  }
}

onMounted(() => {
  fetchCodes()
})
</script>

<style scoped>
:deep(.activation-code-cell) {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  white-space: nowrap;
  color: #18a058;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  cursor: pointer;
}

:deep(.activation-code-cell:hover) {
  text-decoration: underline;
}

:deep(.expired-time-cell) {
  color: #d03050;
  font-weight: 500;
}

:deep(.note-cell-wrapper) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  padding: 2px 0;
}

:deep(.note-cell-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: 13px;
  color: inherit;
}

:deep(.note-cell-text.is-batch) {
  opacity: 0.65;
}

:deep(.note-cell-text.is-empty) {
  opacity: 0.4;
}

:deep(.note-cell-wrapper .edit-note-btn) {
  opacity: 0.35;
  transition: opacity 0.2s ease, transform 0.2s ease;
  margin-left: 4px;
  flex-shrink: 0;
}

:deep(.note-cell-wrapper:hover .edit-note-btn) {
  opacity: 1;
}
</style>
