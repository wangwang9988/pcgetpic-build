<template>
  <div class="backups-page">
    <div class="page-header">
      <div><h1>数据库备份</h1><p>查看所有产品的系统备份，按日期下载主库和归档库。</p></div>
      <n-button :loading="loading" :disabled="loading" @click="refresh">刷新列表</n-button>
    </div>
    <n-alert type="info" :bordered="false">
      主库包含全部历史订单、激活码、授权等业务数据，以及近期统计和累计汇总；归档库存放 90 天以前的统计明细。
      请成对保存同一日期的两个文件。网页下载依赖服务器可用，下载到本地后才有服务器以外的副本。
    </n-alert>
    <n-alert v-if="error" type="error" class="section" closable @close="error = ''">{{ error }}</n-alert>
    <n-alert v-if="downloadNote" type="success" class="section" closable @close="downloadNote = ''">{{ downloadNote }}</n-alert>
    <n-alert v-if="omitted" type="warning" class="section">有 {{ omitted }} 份备份清单或文件异常，已停止提供下载，请检查备份任务日志。</n-alert>
    <n-card title="可下载备份" class="section">
      <n-data-table :columns="columns" :data="backups" :loading="loading" :row-key="rowKey" :scroll-x="900"
        :pagination="{ pageSize: 15 }">
        <template #empty>暂无可下载备份。新版备份脚本成功运行后，已校验的文件会出现在这里。</template>
      </n-data-table>
      <p class="hint">最多显示最近 {{ limit }} 次有效备份。到期或已清理的文件无法继续下载；此列表不随左侧产品切换而改变。</p>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpace, NTooltip, type DataTableColumns } from 'naive-ui'
import { createBackupDownload, getBackups, type BackupKind, type BackupRecord } from '@/api/backups'
const route = useRoute()
const router = useRouter()
const backups = ref<BackupRecord[]>([])
const limit = ref(100)
const omitted = ref(0)
const loading = ref(false)
const downloading = ref('')
const error = ref('')
const downloadNote = ref('')
let autoKey = ''
const rowKey = (row: BackupRecord) => row.id
const formatSize = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MiB`
const formatTime = (time: number) => new Date(time).toLocaleString('zh-CN', { hour12: false })
const columns = computed<DataTableColumns<BackupRecord>>(() => [
  { title: '备份时间', key: 'createdAt', width: 195, render: row => formatTime(row.createdAt) },
  { title: '主库大小', key: 'main', width: 120, render: row => formatSize(row.files.main.bytes) },
  { title: '归档库大小', key: 'archive', width: 135, render: row => row.files.archive ? formatSize(row.files.archive.bytes) : '尚无归档库' },
  { title: '保留至', key: 'expiresAt', width: 195, render: row => formatTime(row.expiresAt) },
  { title: '下载文件', key: 'actions', width: 255, render: row => h(NSpace, { wrap: false }, { default: () =>
    (['main', 'archive'] as const).filter(kind => row.files[kind]).map(kind => h(NTooltip, null, {
      trigger: () => h(NButton, { size: 'small', type: kind === 'main' ? 'primary' : 'default',
        loading: downloading.value === `${row.id}:${kind}`, disabled: !!downloading.value,
        onClick: () => download(row.id, kind) }, { default: () => kind === 'main' ? '下载主库' : '下载归档库' }),
      default: () => `${row.files[kind]!.name} · SHA-256: ${row.files[kind]!.sha256}`,
    })) }) },
])
async function refresh() {
  loading.value = true; error.value = ''
  try {
    const { data } = await getBackups()
    backups.value = data.items; limit.value = data.limit; omitted.value = data.omitted
    return true
  } catch (e: any) {
    error.value = e.response?.data?.message || '备份列表加载失败，请重试'
    return false
  } finally { loading.value = false }
}
async function download(id: string, kind: BackupKind) {
  if (downloading.value) return false
  downloading.value = `${id}:${kind}`; error.value = ''; downloadNote.value = ''
  try {
    const { data } = await createBackupDownload(id, kind)
    const expected = `/api/admin/backup-download/${id}/${kind}`
    if (data.url !== expected) throw new Error('下载地址无效')
    const link = document.createElement('a')
    link.href = data.url; link.download = data.filename; link.rel = 'noreferrer'
    document.body.appendChild(link); link.click(); link.remove()
    downloadNote.value = `已发起 ${data.filename} 的下载，请在浏览器下载列表查看进度。`
    return true
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '下载失败，请重试'
    return false
  } finally { downloading.value = '' }
}
async function followMailLink() {
  if (route.query.download !== '1') return
  const id = route.query.backup, kind = route.query.file
  const key = `${id}:${kind}`
  if (key === autoKey) return
  autoKey = key
  if (typeof id !== 'string' || !/^\d{8}_\d{6}$/.test(id) || (kind !== 'main' && kind !== 'archive')) {
    error.value = '邮件中的备份链接无效，请从下方列表选择文件'; return
  }
  if (await download(id, kind)) {
    // Refreshing the page must not repeatedly start the same download.
    await router.replace({ path: '/backups', query: {} })
  }
}
watch(() => route.fullPath, followMailLink)
onMounted(async () => { if (await refresh()) await followMailLink() })
</script>

<style scoped>
.backups-page { max-width: 1500px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.page-header h1 { margin: 0 0 8px; }
.page-header p, .hint { color: rgba(255,255,255,.6); }
.section { margin-top: 18px; }
.hint { margin-bottom: 0; font-size: 12px; }
@media (max-width: 767px) { .page-header { align-items: flex-start; flex-direction: column; } }
</style>
