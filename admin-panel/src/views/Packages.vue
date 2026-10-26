<template>
  <div>
    <n-space style="margin-bottom: 16px">
      <n-button type="primary" @click="openCreateDialog">新增套餐</n-button>
    </n-space>

    <n-data-table
      :columns="columns"
      :data="packageList"
      :loading="loading"
      :bordered="false"
      :scroll-x="1080"
    />

    <!-- 新增/编辑对话框 -->
    <n-modal
      v-model:show="showModal"
      preset="dialog"
      :title="isEditing ? '编辑套餐' : '新增套餐'"
      positive-text="确认"
      negative-text="取消"
      style="width: 90%; max-width: 560px"
      @positive-click="handleSubmit"
    >
      <!-- 表单项较多（含角标/卖点），限制高度并内部滚动，避免小屏下按钮被顶出视口 -->
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="100"
        style="max-height: 68vh; overflow-y: auto; padding-right: 8px"
      >
        <n-form-item label="所属产品" path="product">
          <n-select v-model:value="formData.product" :options="productOptions" :disabled="isEditing" />
        </n-form-item>
        <n-form-item label="名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入套餐名称" />
        </n-form-item>
        <n-form-item label="时长类型" path="duration_type">
          <n-select
            v-model:value="formData.duration_type"
            :options="durationTypeOptions"
            placeholder="请选择时长类型"
            @update:value="handleDurationTypeChange"
          />
        </n-form-item>
        <n-form-item label="天数" path="duration_days">
          <n-input-number
            v-model:value="formData.duration_days"
            :min="1"
            :disabled="formData.duration_type !== 0"
            style="width: 100%"
            :placeholder="formData.duration_type !== 0 ? '由时长类型自动填充' : '请输入自定义天数'"
          />
        </n-form-item>
        <n-form-item label="价格（元）" path="price">
          <n-input-number v-model:value="formData.price" :min="0" :precision="2" style="width: 100%" placeholder="售价" />
        </n-form-item>
        <n-form-item label="划线原价" path="original_price">
          <n-input-number v-model:value="formData.original_price" :min="0" :precision="2" style="width: 100%" placeholder="选填，不填则不显示划线价" />
        </n-form-item>
        <n-form-item label="港币售价（HK$）" path="price_hkd">
          <n-input-number
            v-model:value="formData.price_hkd"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="留空或 0 表示不开放 Stripe"
          />
          <template #feedback>
            <span v-if="hkdNetHint" style="color: #999; font-size: 12px">{{ hkdNetHint }}</span>
          </template>
        </n-form-item>
        <n-form-item label="英文套餐名称" path="name_en">
          <n-input v-model:value="formData.name_en" style="width: 100%" placeholder="选填，留空按套餐时长自动生成" />
        </n-form-item>
        <n-form-item label="推荐角标（中文）" path="badge">
          <n-input v-model:value="formData.badge" style="width: 100%" placeholder="选填，如：限时特惠；留空按收银台默认规则展示" />
        </n-form-item>
        <n-form-item label="推荐角标（英文）" path="badge_en">
          <n-input v-model:value="formData.badge_en" style="width: 100%" placeholder="选填，如：Best Value；留空按收银台默认规则展示" />
        </n-form-item>
        <n-form-item label="自定义卖点（中文）" path="features">
          <n-input
            v-model:value="featuresText"
            type="textarea"
            :rows="3"
            style="width: 100%"
            placeholder="选填，每行一条；行首加 ★ 表示高亮；最多 15 条、每条 120 字以内；留空按收银台默认权益展示"
          />
        </n-form-item>
        <n-form-item label="自定义卖点（英文）" path="features_en">
          <n-input
            v-model:value="featuresEnText"
            type="textarea"
            :rows="3"
            style="width: 100%"
            placeholder="选填，每行一条；行首加 ★ 表示高亮；最多 15 条、每条 120 字符以内；留空按收银台默认权益展示"
          />
        </n-form-item>
        <n-form-item label="最大设备数" path="max_devices">
          <n-input-number v-model:value="formData.max_devices" :min="1" style="width: 100%" placeholder="最大设备数" />
        </n-form-item>
        <n-form-item label="排序" path="sort_order">
          <n-input-number v-model:value="formData.sort_order" :min="0" style="width: 100%">
            <template #suffix>
              <span style="color: #999; font-size: 12px">数字越小越靠前</span>
            </template>
          </n-input-number>
        </n-form-item>
        <n-form-item label="状态" path="is_active">
          <n-switch v-model:value="formData.is_active" :checked-value="1" :unchecked-value="0">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, computed } from 'vue'
import { useMessage, useDialog, NButton, NSpace, NTag } from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  PackageDurationType,
  type PackageRecord,
  type PackageParams,
} from '@/api/packages'
import { useProductStore } from '@/stores/product'
import { formatProductName } from '@/utils/product'

const message = useMessage()
const dialog = useDialog()
const productStore = useProductStore()
const productOptions = computed(() => {
  if (productStore.products && productStore.products.length > 0) {
    return productStore.products
      .filter((product) => product.is_active === 1)
      .map((product) => ({
        label: formatProductName(product.code, product.name),
        value: product.code,
      }))
  }
  return [
    { label: '当图/DownPictures', value: 'dangtu' },
    { label: '图个吉利/TuGet', value: 'tuget' },
  ]
})

const loading = ref(false)
const packageList = ref<PackageRecord[]>([])

/** 时长类型 → 自动填充天数映射 */
const DURATION_TYPE_DAYS_MAP: Record<number, number> = {
  [PackageDurationType.Trial]: 3,
  [PackageDurationType.Monthly]: 30,
  [PackageDurationType.Yearly]: 365,
  [PackageDurationType.Permanent]: 999999,
}

/** 时长类型选项（0 = 自定义） */
const durationTypeOptions = [
  { label: '3天高级体验', value: PackageDurationType.Trial },
  { label: '1个月', value: PackageDurationType.Monthly },
  { label: '1年', value: PackageDurationType.Yearly },
  { label: '永久', value: PackageDurationType.Permanent },
  { label: '自定义', value: 0 },
]

/** 时长类型文本映射 */
const durationTypeLabel = (type: number): string => {
  const map: Record<number, string> = {
    [PackageDurationType.Trial]: '3天高级体验',
    [PackageDurationType.Monthly]: '1个月',
    [PackageDurationType.Yearly]: '1年',
    [PackageDurationType.Permanent]: '永久',
    0: '自定义',
  }
  return map[type] || '自定义'
}

/** 选择时长类型时自动填充天数 */
function handleDurationTypeChange(value: number) {
  if (value !== 0 && DURATION_TYPE_DAYS_MAP[value] !== undefined) {
    formData.duration_days = DURATION_TYPE_DAYS_MAP[value]
  } else {
    // 自定义类型，清空天数让管理员手动输入
    formData.duration_days = 1
  }
}

/** 对话框状态 */
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

const formData = reactive<PackageParams>({
  product: 'dangtu',
  name: '',
  duration_type: PackageDurationType.Monthly,
  duration_days: 30,
  price: 0,
  original_price: null,
  price_hkd: null,
  name_en: '',
  badge: '',
  badge_en: '',
  features: [],
  features_en: [],
  max_devices: 1,
  sort_order: 0,
  is_active: 1,
})

/**
 * 自定义卖点的多行文本框桥接。
 *
 * 表单模型按接口口径存 string[]（每行一条）；n-input textarea 只能绑字符串，
 * 这里用 computed 双向转换。空串会拆出 ['']，服务端校验时按空行忽略，
 * 等价于"清空恢复默认权益"。
 */
const featuresText = computed({
  get: () => (formData.features ?? []).join('\n'),
  set: (val: string) => {
    formData.features = val.split('\n')
  },
})

const featuresEnText = computed({
  get: () => (formData.features_en ?? []).join('\n'),
  set: (val: string) => {
    formData.features_en = val.split('\n')
  },
})

/**
 * 港币净入账预估提示。
 *
 * Stripe 按约 3.9% + HK$2.35 收费，小额套餐扣完手续费容易倒亏，
 * 让管理员在填价时就能看到净额，而不是等到对账才发现。
 */
const hkdNetHint = computed(() => {
  const value = formData.price_hkd
  if (typeof value !== 'number' || value <= 0) return ''
  const net = value * (1 - 0.039) - 2.35
  return `扣除 Stripe 约 3.9% + HK$2.35 手续费后，预计净入账约 HK$ ${net.toFixed(2)}`
})

const formRules: FormRules = {
  product: { required: true, message: '请选择所属产品', trigger: 'change' },
  name: { required: true, message: '请输入套餐名称', trigger: 'blur' },
  duration_type: { required: true, type: 'number', message: '请选择时长类型', trigger: 'change' },
  duration_days: { required: true, type: 'number', message: '请输入天数', trigger: 'blur' },
  price: { required: true, type: 'number', message: '请输入价格', trigger: 'blur' },
  max_devices: { required: true, type: 'number', message: '请输入最大设备数', trigger: 'blur' },
}

/** 表格列定义 */
const columns: DataTableColumns<PackageRecord> = [
  { title: 'ID', key: 'id', width: 60 },
  { title: '产品', key: 'product', width: 150, render: (row) => formatProductName(row.product) },
  { title: '名称', key: 'name', width: 120 },
  {
    title: '角标',
    key: 'badge',
    width: 100,
    render: (row) =>
      h(NTag, { type: row.badge ? 'warning' : 'default', size: 'small' }, { default: () => row.badge || '默认' }),
  },
  { title: '时长类型', key: 'duration_type', width: 90, render: (row) => durationTypeLabel(row.duration_type) },
  { title: '天数', key: 'duration_days', width: 70, render: (row) => row.duration_days >= 999999 ? '永久' : row.duration_days },
  { title: '价格', key: 'price', width: 80, render: (row) => `¥${row.price}` },
  { title: '原价', key: 'original_price', width: 80, render: (row) => row.original_price ? `¥${row.original_price}` : '-' },
  {
    title: '港币售价',
    key: 'price_hkd',
    width: 100,
    render: (row) => (row.price_hkd && row.price_hkd > 0
      ? h(NTag, { type: 'info', size: 'small' }, { default: () => `HK$ ${row.price_hkd}` })
      : h(NTag, { type: 'default', size: 'small' }, { default: () => '未开启' })),
  },
  { title: '最大设备', key: 'max_devices', width: 80 },
  { title: '排序', key: 'sort_order', width: 60 },
  {
    title: '状态',
    key: 'is_active',
    width: 80,
    render: (row) =>
      h(NTag, { type: row.is_active === 1 ? 'success' : 'default', size: 'small' }, { default: () => (row.is_active === 1 ? '启用' : '禁用') }),
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

/** 获取套餐列表 */
async function fetchPackages() {
  loading.value = true
  try {
    const { data } = await getPackages()
    // 防御空数据：确保 packageList.value 始终为数组，避免表格渲染崩溃
    packageList.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[套餐管理] 获取列表失败:', err)
    message.error('获取套餐列表失败')
  } finally {
    loading.value = false
  }
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  formData.product = productStore.activeProduct || 'dangtu'
  formData.name = ''
  formData.duration_type = PackageDurationType.Monthly
  formData.duration_days = DURATION_TYPE_DAYS_MAP[PackageDurationType.Monthly]
  formData.price = 0
  formData.original_price = null
  formData.price_hkd = null
  formData.name_en = ''
  formData.badge = ''
  formData.badge_en = ''
  formData.features = []
  formData.features_en = []
  formData.max_devices = 1
  formData.sort_order = 0
  formData.is_active = 1
  showModal.value = true
}

/** 打开编辑对话框 */
function openEditDialog(row: PackageRecord) {
  isEditing.value = true
  editingId.value = row.id
  formData.product = row.product
  formData.name = row.name
  formData.duration_type = row.duration_type
  formData.duration_days = row.duration_days
  formData.price = row.price
  formData.original_price = row.original_price ?? null
  formData.price_hkd = row.price_hkd ?? null
  formData.name_en = row.name_en ?? ''
  formData.badge = row.badge ?? ''
  formData.badge_en = row.badge_en ?? ''
  formData.features = row.features ? [...row.features] : []
  formData.features_en = row.features_en ? [...row.features_en] : []
  formData.max_devices = row.max_devices
  formData.sort_order = row.sort_order ?? 0
  formData.is_active = row.is_active
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
      await updatePackage(editingId.value, { ...formData })
      message.success('更新成功')
    } else {
      await createPackage({ ...formData })
      message.success('创建成功')
    }
    showModal.value = false
    fetchPackages()
  } catch (err: any) {
    console.error('[套餐管理] 操作失败:', err)
    // 服务端 400（如角标超长、卖点超限）的 message 直接展示，避免只看到"更新失败"
    const backendMessage = err?.response?.data?.message || err?.message
    message.error(backendMessage || (isEditing.value ? '更新失败' : '创建失败'))
  }
  return false
}

/** 删除套餐 */
function handleDelete(row: PackageRecord) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除套餐「${row.name}」吗？`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deletePackage(row.id)
        message.success('删除成功')
        fetchPackages()
      } catch (err) {
        console.error('[套餐管理] 删除失败:', err)
        message.error('删除失败')
      }
    },
  })
}

onMounted(fetchPackages)
</script>
