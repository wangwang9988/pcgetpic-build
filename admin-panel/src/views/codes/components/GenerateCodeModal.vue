<template>
  <div>
    <!-- 批量生成对话框 -->
    <n-modal
      :show="show"
      preset="dialog"
      title="批量生成激活码"
      positive-text="确认生成"
      negative-text="取消"
      :loading="generating"
      @positive-click="handleGenerate"
      @update:show="handleUpdateShow"
    >
      <n-form ref="genFormRef" :model="genForm" :rules="genRules" label-placement="left" label-width="80">
        <n-form-item label="套餐" path="package_id">
          <n-select
            v-model:value="genForm.package_id"
            :options="packageOptions"
            placeholder="请选择套餐"
            @update:value="handlePackageChange"
          />
        </n-form-item>
        <n-form-item label="渠道" path="channel_id">
          <n-select
            v-model:value="genForm.channel_id"
            :options="channelOptions"
            placeholder="请选择渠道"
          />
        </n-form-item>
        <n-form-item label="生成数量" path="count">
          <n-input-number
            v-model:value="genForm.count"
            :min="1"
            :max="100"
            placeholder="1-100"
            style="width: 100%"
          />
        </n-form-item>
        <n-form-item label="使用数量" path="max_devices">
          <n-input-number
            v-model:value="genForm.max_devices"
            :min="1"
            :max="1000"
            placeholder="每个激活码可激活设备数"
            style="width: 100%"
          >
            <template #suffix>台设备</template>
          </n-input-number>
        </n-form-item>
        <n-form-item label="批次备注" path="batch_note">
          <n-input
            v-model:value="genForm.batch_note"
            placeholder="可选，填写批次备注"
          />
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 生成结果对话框 -->
    <n-modal
      v-model:show="showResultModal"
      preset="dialog"
      title="生成成功"
      :show-icon="false"
      style="width: 90%; max-width: 600px"
    >
      <n-space vertical>
        <n-text>成功生成 {{ generatedCodes.length }} 个激活码：</n-text>
        <n-input
          type="textarea"
          :value="generatedCodes.join('\n')"
          readonly
          :autosize="{ minRows: 5, maxRows: 15 }"
        />
        <n-button type="primary" @click="copyCodes">一键复制</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NInputNumber,
  NInput,
  NSpace,
  NText,
  NButton,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { generateCodes } from '@/api/codes'
import { getPackages, type PackageRecord } from '@/api/packages'
import { getChannels, type ChannelRecord } from '@/api/channels'
import { copyText } from '../utils'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

const DEFAULT_MAX_DEVICES = 3

const generating = ref(false)
const genFormRef = ref<FormInst | null>(null)
const genForm = reactive({
  package_id: null as number | null,
  channel_id: null as number | null,
  count: 1,
  max_devices: DEFAULT_MAX_DEVICES,
  batch_note: '',
})

const genRules: FormRules = {
  package_id: { required: true, type: 'number', message: '请选择套餐', trigger: 'change' },
  channel_id: { required: true, type: 'number', message: '请选择渠道', trigger: 'change' },
  count: { required: true, type: 'number', message: '请输入生成数量', trigger: 'blur' },
  max_devices: { required: true, type: 'number', message: '请输入使用数量', trigger: 'blur' },
}

const packageList = ref<PackageRecord[]>([])
const channelList = ref<ChannelRecord[]>([])
const packageOptions = ref<{ label: string; value: number }[]>([])
const channelOptions = ref<{ label: string; value: number }[]>([])

const showResultModal = ref(false)
const generatedCodes = ref<string[]>([])

/** 获取套餐和渠道列表 */
async function fetchOptions() {
  try {
    const [pkgRes, chRes] = await Promise.all([getPackages(), getChannels()])
    const pkgData = Array.isArray(pkgRes.data) ? pkgRes.data : []
    const chData = Array.isArray(chRes.data) ? chRes.data : []
    packageList.value = pkgData
    channelList.value = chData
    packageOptions.value = pkgData.map((p: PackageRecord) => ({ label: p.name, value: p.id }))
    channelOptions.value = chData.map((c: ChannelRecord) => ({ label: c.name, value: c.id }))
  } catch {
    // 静默处理，不影响主流程
  }
}

/** 套餐切换处理：动态读取并回显所选套餐在数据库中配置的 max_devices（对齐后端默认值 3 兜底） */
function handlePackageChange(pkgId: number | null) {
  if (!pkgId) {
    genForm.max_devices = DEFAULT_MAX_DEVICES
    return
  }
  const pkg = packageList.value.find((p) => p.id === pkgId)
  if (pkg && typeof pkg.max_devices === 'number' && pkg.max_devices > 0) {
    genForm.max_devices = pkg.max_devices
  } else {
    genForm.max_devices = DEFAULT_MAX_DEVICES
  }
}

function resetForm() {
  genForm.package_id = null
  genForm.channel_id = null
  genForm.count = 1
  genForm.max_devices = DEFAULT_MAX_DEVICES
  genForm.batch_note = ''
}

function handleUpdateShow(val: boolean) {
  emit('update:show', val)
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      resetForm()
      if (packageOptions.value.length === 0 || channelOptions.value.length === 0) {
        fetchOptions()
      }
    }
  },
  { immediate: true },
)

/** 批量生成激活码 */
async function handleGenerate() {
  try {
    await genFormRef.value?.validate()
  } catch {
    return false
  }

  generating.value = true
  try {
    const { data } = await generateCodes({
      package_id: genForm.package_id!,
      channel_id: genForm.channel_id!,
      count: genForm.count,
      max_devices: genForm.max_devices,
      batch_note: genForm.batch_note,
    })
    generatedCodes.value = Array.isArray(data.codes)
      ? data.codes.map((item: any) => item.code || item)
      : []
    emit('update:show', false)
    showResultModal.value = true
    resetForm()
    emit('success')
  } catch {
    message.error('生成激活码失败')
  } finally {
    generating.value = false
  }
  return false
}

/** 一键复制生成的激活码 */
async function copyCodes() {
  try {
    await copyText(generatedCodes.value.join('\n'))
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动选择复制')
  }
}
</script>
