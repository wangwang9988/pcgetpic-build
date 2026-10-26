<script setup lang="ts">
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag, useDialog, useMessage, useThemeVars, type DataTableColumns } from 'naive-ui'
import { getFeedbacks, getFeedback, getFeedbackImage, getFeedbackVersions, getFeedbackHistory, replyFeedback, setFeedbackStatus, deleteFeedback, type Feedback, type FeedbackList, type FeedbackHistory as HistoryData, type FeedbackArchiveTarget } from '@/api/feedbacks'
import FeedbackHistory from '@/components/FeedbackHistory.vue'
import FeedbackArchive from '@/components/FeedbackArchive.vue'
import { useProductStore } from '@/stores/product'
import { createLatestRequest } from '@/utils/latestRequest'
const router = useRouter(), store = useProductStore(), message = useMessage(), dialog = useDialog()
const themeVars = useThemeVars()
const product = ref(store.activeProduct || ''), status = ref<string | null>(null), search = ref(''), page = ref(1)
const version = ref<string | null>(null), versions = ref<string[]>([]), versionsLoading = ref(false)
const archive = ref<{ kind: 'device' | 'license'; value: string } | null>(null)
const archiveVisible = ref(false), archiveTarget = ref<FeedbackArchiveTarget | null>(null)
const loading = ref(false), detailLoading = ref(false), saving = ref(false), visible = ref(false)
const detail = ref<Feedback | null>(null), reply = ref(''), pictures = ref<string[]>([]), imageError = ref('')
const editingReply = ref(false)
const drafts = new Map<string, { reply: string; editing: boolean }>()
const draftRestored = ref(false), detailTop = ref<HTMLElement | null>(null)
const historyKind = ref<'device' | 'license'>('device'), history = ref<HistoryData | null>(null)
const historyLoading = ref(false), historyError = ref('')
const license = computed(() => detail.value?.context?.license)
const replyRead = computed(() => !!detail.value?.replied_at && !!detail.value.client_read_at
  && detail.value.client_read_at >= detail.value.replied_at)
const canSendReply = computed(() => !!detail.value && detail.value.status !== 'closed' && !saving.value
  && !!reply.value.trim() && reply.value.trim() !== (detail.value.reply_content || '').trim())
const data = ref<FeedbackList>({ items: [], total: 0, page: 1, page_size: 20, summary: { pending: 0, today: 0, handled_24h: 0 } })
const listRequests = createLatestRequest(), detailRequests = createLatestRequest()
const versionRequests = createLatestRequest(), historyRequests = createLatestRequest()
let disposed = false
const products = computed(() => [{ label: '全部产品', value: '' }, ...store.products.map(p => ({ label: p.name, value: p.code }))])
const labels = { pending: '待回复', replied: '已回复', closed: '已办结' }
const statusOptions = Object.entries(labels).map(([value, label]) => ({ value, label }))
const time = (value: number | null) => value ? new Date(value).toLocaleString('zh-CN') : '—'
const productName = (code: string) => store.products.find(p => p.code === code)?.name || code
const versionOptions = computed(() => versions.value.map(value => ({ label: value, value })))
const shortDevice = (value: string) => `${value.slice(0, 12)}…`
function problem(error: unknown): string {
  const e = error as { response?: { data?: { message?: string } }; message?: string }
  return e.response?.data?.message || e.message || '工单操作失败'
}
function releasePictures(): void { pictures.value.forEach(url => URL.revokeObjectURL(url)); pictures.value = [] }
async function loadVersions(): Promise<void> {
  const current = versionRequests.begin()
  versionsLoading.value = true; versions.value = []
  try {
    const response = await getFeedbackVersions(product.value || undefined)
    if (current()) versions.value = response.data
  } catch (error) { if (current()) message.error(`版本列表加载失败：${problem(error)}`) }
  finally { if (current()) versionsLoading.value = false }
}
async function refresh(): Promise<void> {
  if (disposed) return
  const current = listRequests.begin()
  loading.value = true
  try {
    const response = await getFeedbacks({ product: product.value || undefined, status: status.value || undefined, search: search.value || undefined,
      version: version.value || undefined, device_hash: archive.value?.kind === 'device' ? archive.value.value : undefined,
      activation_code: archive.value?.kind === 'license' ? archive.value.value : undefined, page: page.value })
    if (current()) data.value = response.data
  } catch (error) { if (current()) message.error(problem(error)) }
  finally { if (current()) loading.value = false }
}
function filter(): void { if (page.value !== 1) page.value = 1; else void refresh() }
function changeProduct(): void {
  archive.value = null; version.value = null
  void loadVersions(); filter()
}
function filterVersion(row: Feedback): void {
  if (product.value !== row.product) { product.value = row.product; archive.value = null; void loadVersions() }
  version.value = row.client_version; filter()
}
function showArchive(row: Feedback, kind: 'device' | 'license'): void {
  const value = kind === 'device' ? row.device_hash : row.activation_code
  if (!value || saving.value) return
  archiveTarget.value = { kind, value, product: row.product }
  visible.value = false; archiveVisible.value = true
}
function filterArchive(target: FeedbackArchiveTarget): void {
  if (saving.value) return
  if (product.value !== target.product) { product.value = target.product; void loadVersions() }
  archive.value = { kind: target.kind, value: target.value }; status.value = null; version.value = null; search.value = ''
  archiveVisible.value = false; filter()
}
function clearArchive(): void { archive.value = null; filter() }
function rememberDraft(): void {
  if (!detail.value) return
  if (reply.value || editingReply.value) drafts.set(detail.value.feedback_id, { reply: reply.value, editing: editingReply.value })
  else drafts.delete(detail.value.feedback_id)
}
async function loadHistory(targetPage?: number): Promise<void> {
  if (!detail.value || disposed) return
  const current = historyRequests.begin(), id = detail.value.feedback_id, kind = historyKind.value
  historyLoading.value = true; historyError.value = ''
  try {
    const response = await getFeedbackHistory(id, kind, targetPage)
    if (current()) {
      history.value = response.data
      const context = detail.value?.context
      if (context) {
        if (kind === 'device') context.device = response.data.summary
        else if (context.license) context.license.history = response.data.summary
      }
    }
  } catch (error) { if (current()) historyError.value = problem(error) }
  finally { if (current()) historyLoading.value = false }
}
function changeHistory(kind: 'device' | 'license'): void {
  historyKind.value = kind; history.value = null; void loadHistory()
}
async function open(id: string): Promise<void> {
  if (disposed || saving.value) return
  rememberDraft()
  const current = detailRequests.begin()
  historyRequests.invalidate(); history.value = null; historyError.value = ''; historyLoading.value = false
  visible.value = true; detailLoading.value = true; detail.value = null; reply.value = ''; editingReply.value = false; imageError.value = ''
  draftRestored.value = false
  releasePictures()
  try {
    const result = await getFeedback(id)
    if (!current()) return
    detail.value = result.data
    const draft = drafts.get(id)
    if (draft && result.data.status !== 'closed') {
      reply.value = draft.reply; editingReply.value = draft.editing; draftRestored.value = true
    }
    if (!result.data.context?.license) historyKind.value = 'device'
    void loadHistory()
    await nextTick()
    if (!current()) return
    detailTop.value?.scrollIntoView({ block: 'start' })
    const images = await Promise.allSettled(Array.from({ length: result.data.image_count }, (_, index) => getFeedbackImage(id, index)))
    if (!current()) return
    for (const image of images) {
      if (image.status === 'fulfilled') pictures.value.push(URL.createObjectURL(image.value.data))
      else imageError.value = '部分截图读取失败，请重新打开工单重试'
    }
  } catch (error) { if (current()) message.error(problem(error)) }
  finally { if (current()) detailLoading.value = false }
}
function editReply(): void {
  if (!detail.value || saving.value || detail.value.status === 'closed') return
  reply.value = detail.value.reply_content || ''
  editingReply.value = true
}
function cancelReplyEdit(): void {
  if (detail.value) drafts.delete(detail.value.feedback_id)
  reply.value = ''
  editingReply.value = false
  draftRestored.value = false
}
async function act(action: 'reply' | 'closed' | 'pending'): Promise<void> {
  if (!detail.value || saving.value) return
  if (action === 'reply' && !canSendReply.value) return
  const id = detail.value.feedback_id
  saving.value = true
  try {
    const response = action === 'reply'
      ? await replyFeedback(id, reply.value.trim())
      : await setFeedbackStatus(id, action)
    if (disposed) return
    // The mutation already returns the saved reply/status. Keep the detail and
    // screenshots in place even if the subsequent list refresh cannot finish.
    if (detail.value?.feedback_id === id) {
      const pendingChange = Number(response.data.status === 'pending') - Number(detail.value.status === 'pending')
      if (detail.value.context) {
        detail.value.context.device.pending += pendingChange
        if (detail.value.context.license) detail.value.context.license.history.pending += pendingChange
      }
      detail.value = { ...detail.value, ...response.data }
      if (action === 'reply' || action === 'closed') cancelReplyEdit()
    }
    data.value.items = data.value.items.map(item => item.feedback_id === id ? { ...item, ...response.data } : item)
    message.success(action === 'reply' ? '回复已发送' : '工单状态已更新')
    await Promise.all([refresh(), loadHistory(history.value?.page ?? 1)])
  } catch (error) { if (!disposed) message.error(problem(error)) }
  finally { saving.value = false }
}
function remove(): void {
  if (!detail.value || saving.value) return
  const id = detail.value.feedback_id
  dialog.warning({ title: '删除工单', content: '将永久删除此工单及截图，确定删除？', positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      saving.value = true
      try { await deleteFeedback(id); drafts.delete(id); reply.value = ''; editingReply.value = false; visible.value = false; message.success('工单已删除'); await refresh() }
      catch (error) { message.error(problem(error)); return false }
      finally { saving.value = false }
    },
  })
}
function openDiagnostic(): void {
  if (!detail.value?.report_id) return
  store.setActiveProduct(detail.value.product)
  void router.push({ name: 'ClientErrors', query: { search: detail.value.report_id } })
}
const columns: DataTableColumns<Feedback> = [
  { title: '工单号', key: 'feedback_id', width: 140, ellipsis: { tooltip: true } },
  { title: '产品', key: 'product', width: 110, render: row => productName(row.product) },
  { title: '标题', key: 'title', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '版本', key: 'client_version', width: 110, render: row => h(NButton, { text: true, type: 'primary', onClick: () => filterVersion(row) }, { default: () => row.client_version }) },
  { title: '设备归档', key: 'device_hash', width: 140, render: row => h(NButton, { text: true, type: 'primary', title: row.device_hash, onClick: () => showArchive(row, 'device') }, { default: () => shortDevice(row.device_hash) }) },
  { title: '授权归档', key: 'activation_code', width: 160, render: row => {
    const code = row.activation_code
    return code ? h(NButton, { text: true, type: 'primary', title: code, onClick: () => showArchive(row, 'license') }, { default: () => `${code.slice(0, 4)}…${code.slice(-5)}` }) : '未关联授权'
  } },
  { title: '截图', key: 'image_count', width: 65 },
  { title: '关联错误', key: 'report_id', width: 110, render: row => row.report_id ? h(NTag, { type: 'warning', size: 'small' }, { default: () => '有诊断日志' }) : '—' },
  { title: '提交时间', key: 'created_at', width: 175, render: row => time(row.created_at) },
  { title: '状态', key: 'status', width: 95, render: row => h(NTag, { type: row.status === 'pending' ? 'warning' : row.status === 'replied' ? 'success' : 'default', size: 'small' }, { default: () => labels[row.status] }) },
  { title: '操作', key: 'actions', width: 90, render: row => h(NButton, { size: 'small', onClick: () => open(row.feedback_id) }, { default: () => '查看处理' }) },
]
watch(page, () => { void refresh() })
watch(visible, value => { if (!value) {
  rememberDraft(); detailRequests.invalidate(); historyRequests.invalidate(); releasePictures(); detail.value = null
} })
onMounted(() => { void refresh(); void loadVersions() })
onUnmounted(() => {
  disposed = true; listRequests.invalidate(); detailRequests.invalidate(); versionRequests.invalidate(); historyRequests.invalidate(); releasePictures(); drafts.clear()
})
</script>

<template>
  <div class="feedbacks-page">
    <div class="heading"><div><h1>工单反馈</h1><p>按设备、授权和版本查看反馈，结合历史答复继续跟进</p></div><n-button :loading="loading" @click="refresh(); loadVersions()">刷新</n-button></div>
    <n-grid cols="1 s:3" responsive="screen" :x-gap="16" :y-gap="16">
      <n-gi><n-card><n-statistic label="待回复工单" :value="data.summary.pending" /></n-card></n-gi>
      <n-gi><n-card><n-statistic label="今日新增（北京时间）" :value="data.summary.today" /></n-card></n-gi>
      <n-gi><n-card><n-statistic label="24 小时处理工单" :value="data.summary.handled_24h" /></n-card></n-gi>
    </n-grid>
    <n-card>
      <div class="filters">
        <n-select v-model:value="product" :options="products" aria-label="产品筛选" @update:value="changeProduct" />
        <n-select v-model:value="status" :options="statusOptions" clearable aria-label="工单状态筛选" placeholder="全部状态" @update:value="filter" />
        <n-select v-model:value="version" :options="versionOptions" filterable tag clearable :loading="versionsLoading" aria-label="客户端版本筛选" placeholder="版本：选择或输入" @update:value="filter" />
        <n-input v-model:value="search" clearable aria-label="工单搜索" placeholder="工单号、标题、激活码或设备标识" @keyup.enter="filter" />
        <n-button @click="filter">查询</n-button>
      </div>
      <p class="filter-help">完整版本精确查询；输入 1.2 并回车可查询 1.2 系列。上方统计按产品汇总。</p>
      <n-alert v-if="archive" type="info" :bordered="false" class="archive-banner">
        <div class="archive-heading"><span class="wrap">{{ archive.kind === 'device' ? '设备归档' : '授权归档' }} · {{ productName(product) }} · {{ archive.value }}</span><n-button size="small" @click="clearArchive">退出归档</n-button></div>
      </n-alert>
      <n-data-table :columns="columns" :data="data.items" :loading="loading" :pagination="false" :scroll-x="1500" :row-key="(row: Feedback) => row.feedback_id" />
      <div class="pagination"><n-pagination v-model:page="page" :page-size="data.page_size" :item-count="data.total" :page-slot="7" /></div>
    </n-card>
    <FeedbackArchive v-model:show="archiveVisible" :target="archiveTarget" :blocked="visible || saving" @open="open" @filter="filterArchive" />
    <n-drawer v-model:show="visible" width="min(720px, 100vw)" :close-on-esc="!saving" :mask-closable="!saving" placement="right">
      <n-drawer-content title="工单详情与回复" :closable="!saving">
        <n-spin :show="detailLoading">
          <template v-if="detail">
            <div ref="detailTop" class="device-navigation">
              <span v-if="detail.context">设备反馈 · 第 {{ detail.context.device_position }} / {{ detail.context.device.total }} 条（由早到晚）</span>
              <div class="navigation-actions">
                <n-button v-if="archiveVisible" size="small" :disabled="saving" @click="visible = false">返回归档</n-button>
                <n-button size="small" :disabled="saving || detailLoading || !detail.context?.prev_feedback_id" @click="detail.context?.prev_feedback_id && open(detail.context.prev_feedback_id)">上一条（较早）</n-button>
                <n-button size="small" :disabled="saving || detailLoading || !detail.context?.next_feedback_id" @click="detail.context?.next_feedback_id && open(detail.context.next_feedback_id)">下一条（较新）</n-button>
              </div>
            </div>
            <n-descriptions bordered :column="2" size="small" label-placement="left">
              <n-descriptions-item label="工单号" :span="2">{{ detail.feedback_id }}</n-descriptions-item>
              <n-descriptions-item label="产品">{{ productName(detail.product) }}</n-descriptions-item>
              <n-descriptions-item label="状态">{{ labels[detail.status] }}</n-descriptions-item>
              <n-descriptions-item label="激活码" :span="2"><n-button v-if="detail.activation_code" text type="primary" class="identity-link" :disabled="saving" @click="showArchive(detail, 'license')">{{ detail.activation_code }}</n-button><span v-else>未关联授权</span></n-descriptions-item>
              <n-descriptions-item label="设备" :span="2"><n-button text type="primary" class="identity-link" :disabled="saving" @click="showArchive(detail, 'device')">{{ detail.device_hash }}</n-button></n-descriptions-item>
              <n-descriptions-item label="客户端版本">{{ detail.client_version }}</n-descriptions-item>
              <n-descriptions-item label="提交时间">{{ time(detail.created_at) }}</n-descriptions-item>
            </n-descriptions>
            <n-card v-if="license" title="授权信息" size="small" class="context-card">
              <n-descriptions :column="2" size="small" label-placement="left">
                <n-descriptions-item label="套餐">{{ license.package_name || '未关联套餐' }}</n-descriptions-item>
                <n-descriptions-item label="状态"><n-tag size="small" :type="license.status === 2 ? 'error' : 'default'">{{ license.status_label }}</n-tag></n-descriptions-item>
                <n-descriptions-item label="授权类型">{{ license.duration_label }}</n-descriptions-item>
                <n-descriptions-item label="绑定设备">{{ license.bound_count }} / {{ license.max_devices }} 台</n-descriptions-item>
                <n-descriptions-item label="有效期" :span="2">
                  <span v-if="license.permanent">永久授权</span>
                  <span v-else-if="license.expires_at === null">尚未激活，期限 {{ license.duration_days }} 天</span>
                  <span v-else>{{ time(license.expires_at) }} 到期 <n-tag v-if="license.expires_at < Date.now()" size="small" type="warning">已到期</n-tag></span>
                </n-descriptions-item>
              </n-descriptions>
              <p class="filter-help">该授权下 {{ license.history.device_count }} 台设备有反馈，共 {{ license.history.total }} 条，待回复 {{ license.history.pending }} 条。</p>
            </n-card>
            <h2 class="wrap">{{ detail.title }}</h2><p class="content">{{ detail.content }}</p>
            <n-image-group><div class="pictures"><n-image v-for="(src, i) in pictures" :key="src" :src="src" :alt="`问题截图 ${i + 1}`" width="180" height="130" object-fit="contain" /></div></n-image-group>
            <n-alert v-if="imageError" type="warning">{{ imageError }}</n-alert>
            <n-alert v-if="detail.images_cleaned_at" type="info">附件已在 {{ time(detail.images_cleaned_at) }} 按 60 天规则清理。</n-alert>
            <section class="reply-section" aria-label="客服回复" :style="{ '--feedback-primary-color': themeVars.primaryColor, '--feedback-muted-color': themeVars.textColor3 }">
              <n-card v-if="detail.reply_content" size="small" class="sent-reply" aria-label="已发送的回复">
                <template #header>
                  <div class="reply-heading">
                    <span>已发送的回复</span>
                    <n-tag :type="replyRead ? 'success' : 'warning'" size="small" :bordered="false">{{ replyRead ? '客户已读' : '客户未读' }}</n-tag>
                  </div>
                </template>
                <p class="reply-meta">发送时间：{{ time(detail.replied_at) }}<span v-if="replyRead"> · 已读时间：{{ time(detail.client_read_at) }}</span></p>
                <p class="content sent-reply-content">{{ detail.reply_content }}</p>
                <template v-if="detail.status !== 'closed' && !editingReply" #action>
                  <n-button size="small" :disabled="saving" @click="editReply">修改回复</n-button>
                </template>
              </n-card>
              <n-alert v-else-if="detail.status === 'closed'" type="info" :bordered="false">该工单已办结，尚未发送客服回复。需要回复时可先重新打开工单。</n-alert>
              <div v-if="detail.status !== 'closed' && (!detail.reply_content || editingReply)" class="reply-editor">
                <h3>{{ detail.reply_content ? '修改回复' : '撰写回复' }}</h3>
                <p v-if="draftRestored" class="reply-help">已恢复本页面暂存的回复草稿。</p>
                <p v-else class="reply-help">切换历史工单会暂存草稿，刷新或离开页面后清除。</p>
                <p v-if="detail.reply_content" class="reply-help">发送后将替换当前回复，客户会看到更新后的内容。</p>
                <n-input v-model:value="reply" type="textarea" :autosize="{ minRows: 5, maxRows: 12 }" :maxlength="2000" show-count placeholder="请填写解决步骤或需要补充的信息" :disabled="saving" />
                <div class="actions">
                  <n-button type="primary" :loading="saving" :disabled="!canSendReply" @click="act('reply')">{{ detail.reply_content ? '更新并发送回复' : '发送回复' }}</n-button>
                  <n-button v-if="editingReply" :disabled="saving" @click="cancelReplyEdit">取消修改</n-button>
                </div>
              </div>
            </section>
            <n-card v-if="detail.diagnostic" title="关联运行错误" size="small" class="diagnostic">
              <p>{{ detail.diagnostic.error_source }} · {{ detail.diagnostic.os_name }} {{ detail.diagnostic.os_version }} · {{ detail.diagnostic.architecture }}</p>
              <p class="content">{{ detail.diagnostic.error_message }}</p>
              <n-collapse><n-collapse-item title="查看完整诊断日志" name="log"><pre>{{ detail.diagnostic.diagnostic_text }}</pre></n-collapse-item></n-collapse>
              <n-button size="small" class="log-link" @click="openDiagnostic">跳转至客户端错误页面</n-button>
            </n-card>
            <n-alert v-else-if="detail.report_id" type="warning">关联错误日志已不存在。</n-alert>
            <n-card title="关联反馈历史" size="small" class="context-card">
              <n-tabs :value="historyKind" type="segment" @update:value="changeHistory">
                <n-tab name="device" :disabled="saving">同设备（{{ detail.context?.device.total ?? 0 }}）</n-tab>
                <n-tab name="license" :disabled="saving || !license">同授权（{{ license?.history.total ?? 0 }}）</n-tab>
              </n-tabs>
              <p class="filter-help">包含全部状态与版本，按提交时间从新到旧排列。{{ license ? '' : '当前工单未关联授权。' }}</p>
              <FeedbackHistory :key="historyKind" :history="history" :current-id="detail.feedback_id" :loading="historyLoading" :disabled="saving" :error="historyError" @open="open" @page="loadHistory" @retry="loadHistory(history?.page)" />
            </n-card>
            <div class="actions">
              <n-button v-if="detail.status !== 'closed'" :disabled="saving" @click="act('closed')">标记办结</n-button>
              <n-button v-else :disabled="saving" @click="act('pending')">重新打开</n-button>
              <n-button type="error" secondary :disabled="saving" @click="remove">删除工单</n-button>
            </div>
          </template>
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.feedbacks-page { display: flex; flex-direction: column; gap: 18px; }
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.heading h1 { margin: 0; font-size: 24px; }.heading p { margin-bottom: 0; opacity: .65; }
.filters { display: grid; grid-template-columns: 150px 130px minmax(180px, 220px) minmax(220px, 1fr) auto; gap: 12px; margin-bottom: 8px; }
.filter-help { font-size: 12px; opacity: .65; line-height: 1.7; margin: 8px 0 14px; }
.archive-banner { margin: 12px 0; }.archive-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.archive-heading > span { min-width: 0; }.archive-heading > button { flex-shrink: 0; }
.device-navigation { margin-bottom: 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.navigation-actions { display: flex; flex-wrap: wrap; gap: 8px; }.context-card { margin-top: 18px; }
.identity-link { height: auto; max-width: 100%; text-align: left; }
.identity-link :deep(.n-button__content) { white-space: normal; word-break: break-all; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.content, pre { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.wrap { overflow-wrap: anywhere; }.pictures { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
.diagnostic { margin-top: 18px; }.log-link { margin-top: 12px; }
.reply-section { margin-top: 20px; }
.sent-reply { border-left: 3px solid var(--feedback-primary-color); }
.reply-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 15px; font-weight: 600; }
.reply-meta, .reply-help { margin: 0 0 12px; font-size: 12px; color: var(--feedback-muted-color); line-height: 1.7; }
.sent-reply-content { margin: 0; font-size: 14px; user-select: text; }
.reply-editor { margin-top: 18px; }.reply-editor h3 { margin: 0 0 12px; font-size: 15px; }
pre { max-height: 420px; overflow: auto; background: #101826; color: #e2e8f0; padding: 14px; border-radius: 6px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
@media (max-width: 1150px) { .filters { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .filters { grid-template-columns: 1fr; } }
</style>
