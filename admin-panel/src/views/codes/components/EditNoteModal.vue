<template>
  <n-modal
    :show="show"
    preset="dialog"
    title="修改激活码备注"
    positive-text="保存"
    negative-text="取消"
    :loading="savingNote"
    style="width: 90%; max-width: 520px"
    @positive-click="handleSaveNote"
    @update:show="handleUpdateShow"
  >
    <n-space vertical style="width: 100%" size="medium">
      <div style="font-size: 13px;">
        <n-text depth="3">激活码：</n-text><n-text code>{{ codeRecord?.code || '-' }}</n-text>
      </div>
      <div
        v-if="codeRecord?.batch_note"
        style="font-size: 12px; color: rgba(255, 255, 255, 0.7); background: rgba(255, 255, 255, 0.05); padding: 8px 12px; border-radius: 4px; border: 1px dashed rgba(255, 255, 255, 0.15); white-space: pre-wrap; word-break: break-word;"
      >
        <span style="font-weight: 600;">批次/系统记录：</span>{{ codeRecord.batch_note }}
      </div>
      <div>
        <n-text depth="3" style="font-size: 12px; margin-bottom: 6px; display: block">快捷预填常用场景标签：</n-text>
        <n-space size="small">
          <n-tag
            v-for="tag in quickNoteTags"
            :key="tag"
            size="small"
            clickable
            @click="handleQuickTagClick(tag)"
          >
            {{ tag }}
          </n-tag>
        </n-space>
      </div>
      <n-input
        v-model:value="editingNoteText"
        type="textarea"
        placeholder="请输入人工备注（支持多行，如具体用途、受赠人群等，最多500字）"
        :autosize="{ minRows: 3, maxRows: 6 }"
        maxlength="500"
        show-count
        clearable
      />
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NModal, NSpace, NText, NTag, NInput, useMessage } from 'naive-ui'
import { updateCodeNote, type CodeRecord } from '@/api/codes'

const props = defineProps<{
  show: boolean
  codeRecord: CodeRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success', payload: { id: number; manual_note: string }): void
}>()

const message = useMessage()

const savingNote = ref(false)
const editingNoteText = ref('')
const quickNoteTags = ['应用商店', '特定人群赠送', '大客户测试', '售后补发', '活动推广']

function handleUpdateShow(val: boolean) {
  emit('update:show', val)
}

function handleQuickTagClick(tag: string) {
  if (!editingNoteText.value) {
    editingNoteText.value = tag
  } else if (!editingNoteText.value.includes(tag)) {
    editingNoteText.value = `${editingNoteText.value}，${tag}`
  }
}

watch(
  () => [props.show, props.codeRecord] as const,
  ([show, record]) => {
    if (show && record) {
      editingNoteText.value = record.manual_note || ''
    } else if (!show) {
      editingNoteText.value = ''
    }
  },
  { immediate: true },
)

async function handleSaveNote() {
  if (!props.codeRecord) return false
  const trimmed = editingNoteText.value.trim()
  if (trimmed.length > 500) {
    message.error('备注长度不能超过 500 个字符')
    return false
  }

  savingNote.value = true
  try {
    const { data } = await updateCodeNote(props.codeRecord.id, trimmed)
    message.success('备注已保存')
    emit('update:show', false)
    emit('success', { id: props.codeRecord.id, manual_note: data.manual_note })
  } catch {
    message.error('保存备注失败')
    return false
  } finally {
    savingNote.value = false
  }
  return false
}
</script>
