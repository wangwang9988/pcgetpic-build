<template>
  <div>
    <n-space style="margin-bottom: 16px">
      <n-button type="primary" @click="openCreateDialog">新增渠道</n-button>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="channelList"
      :loading="loading"
      :bordered="false"
      :scroll-x="720"
    />

    <!-- 新增/编辑对话框 -->
    <n-modal
      v-model:show="showModal"
      preset="dialog"
      :title="isEditing ? '编辑渠道' : '新增渠道'"
      positive-text="确认"
      negative-text="取消"
      @positive-click="handleSubmit"
    >
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="60">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入渠道名称" />
        </n-form-item>
        <n-form-item label="代码" path="code">
          <n-input v-model:value="formData.code" placeholder="请输入渠道代码（英文标识）" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, useDialog, NButton, NSpace } from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import {
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  type ChannelRecord,
  type ChannelParams,
} from '@/api/channels'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const channelList = ref<ChannelRecord[]>([])

/** 对话框状态 */
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

const formData = reactive<ChannelParams>({
  name: '',
  code: '',
})

const formRules: FormRules = {
  name: { required: true, message: '请输入渠道名称', trigger: 'blur' },
  code: { required: true, message: '请输入渠道代码', trigger: 'blur' },
}

/** 格式化时间戳为可读时间 */
function formatTimestamp(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const date = new Date(typeof ts === 'number' ? ts : Number(ts))
  if (isNaN(date.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 表格列定义 */
const columns: DataTableColumns<ChannelRecord> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '名称', key: 'name', width: 150 },
  { title: '代码', key: 'code', width: 150 },
  {
    title: '创建时间',
    key: 'created_at',
    width: 180,
    render: (row) => formatTimestamp(row.created_at),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) =>
      h(NSpace, null, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => openEditDialog(row) }, { default: () => '编辑' }),
          h(
            NButton,
            { size: 'small', type: 'error', onClick: () => handleDelete(row) },
            { default: () => '删除' },
          ),
        ],
      }),
  },
]

/** 获取渠道列表 */
async function fetchChannels() {
  loading.value = true
  try {
    const { data } = await getChannels()
    // 防御空数据：确保 channelList.value 始终为数组，避免表格渲染崩溃
    channelList.value = Array.isArray(data) ? data : []
  } catch {
    message.error('获取渠道列表失败')
  } finally {
    loading.value = false
  }
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  formData.name = ''
  formData.code = ''
  showModal.value = true
}

/** 打开编辑对话框 */
function openEditDialog(row: ChannelRecord) {
  isEditing.value = true
  editingId.value = row.id
  formData.name = row.name
  formData.code = row.code
  showModal.value = true
}

/** 提交表单 */
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return false
  }

  try {
    if (isEditing.value && editingId.value) {
      await updateChannel(editingId.value, { ...formData })
      message.success('更新成功')
    } else {
      await createChannel({ ...formData })
      message.success('创建成功')
    }
    showModal.value = false
    fetchChannels()
  } catch {
    message.error(isEditing.value ? '更新失败' : '创建失败')
  }
  return false
}

/** 删除渠道 */
function handleDelete(row: ChannelRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除渠道「${row.name}」吗？`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteChannel(row.id)
        message.success('删除成功')
        fetchChannels()
      } catch {
        message.error('删除失败')
      }
    },
  })
}

onMounted(fetchChannels)
</script>
