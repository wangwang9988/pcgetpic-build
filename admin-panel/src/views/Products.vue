<template>
  <div>
    <n-space style="margin-bottom: 16px">
      <n-button type="primary" @click="openCreate">新增产品</n-button>
      <n-button :loading="productStore.loading" @click="productStore.loadProducts">刷新</n-button>
    </n-space>

    <n-alert type="info" style="margin-bottom: 16px">
      产品已有套餐、激活码或订单后，其形态、激活码前缀、订单前缀和密钥变量名将被锁定。密钥值只通过服务端环境变量配置，不会在后台保存或展示。
    </n-alert>

    <n-data-table :columns="columns" :data="productStore.products" :loading="productStore.loading" :scroll-x="1180" />

    <n-modal
      v-model:show="showModal"
      preset="dialog"
      :title="editingCode ? '编辑产品' : '新增产品'"
      positive-text="保存"
      negative-text="取消"
      style="width: 92%; max-width: 640px"
      @positive-click="submit"
    >
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="120">
        <n-form-item label="产品代码" path="code">
          <n-input v-model:value="form.code" :disabled="Boolean(editingCode)" placeholder="例如 tuget" />
        </n-form-item>
        <n-form-item label="产品名称" path="name"><n-input v-model:value="form.name" /></n-form-item>
        <n-form-item label="产品形态" path="kind">
          <n-select v-model:value="form.kind" :options="kindOptions" />
        </n-form-item>
        <n-form-item label="激活码前缀" path="code_prefix"><n-input v-model:value="form.code_prefix" placeholder="例如 TGTU" /></n-form-item>
        <n-form-item label="订单号前缀" path="order_prefix"><n-input v-model:value="form.order_prefix" placeholder="例如 TGTU" /></n-form-item>
        <n-form-item label="HMAC 环境变量" path="hmac_secret_env"><n-input v-model:value="form.hmac_secret_env" placeholder="HMAC_SECRET_TUGET" /></n-form-item>
        <n-form-item label="购买地址" path="store_url"><n-input v-model:value="form.store_url" placeholder="https://..." /></n-form-item>
        <n-form-item label="支持邮箱"><n-input v-model:value="form.support_email" /></n-form-item>
        <n-form-item label="排序"><n-input-number v-model:value="form.sort_order" :min="0" /></n-form-item>
        <n-form-item label="状态"><n-switch v-model:value="form.is_active" :checked-value="1" :unchecked-value="0" /></n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, reactive, ref } from 'vue'
import { NButton, NSpace, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import { createProduct, updateProduct, type ProductParams, type ProductRecord } from '@/api/products'
import { useProductStore } from '@/stores/product'

const message = useMessage()
const productStore = useProductStore()
const showModal = ref(false)
const editingCode = ref('')
const formRef = ref<FormInst | null>(null)
const kindOptions = [
  { label: '桌面客户端', value: 'desktop' },
  { label: '浏览器扩展', value: 'extension' },
]

const emptyForm = (): ProductParams => ({
  code: '', name: '', kind: 'desktop', code_prefix: '', order_prefix: '',
  hmac_secret_env: '', store_url: '', support_email: '', is_active: 1, sort_order: 0,
})
const form = reactive<ProductParams>(emptyForm())
const rules: FormRules = {
  code: { required: true, pattern: /^[a-z0-9_-]{2,32}$/, message: '请输入合法的小写产品代码', trigger: 'blur' },
  name: { required: true, message: '请输入产品名称', trigger: 'blur' },
  kind: { required: true, message: '请选择产品形态', trigger: 'change' },
  code_prefix: { required: true, pattern: /^[A-Z0-9]{2,8}$/, message: '请输入 2-8 位大写前缀', trigger: 'blur' },
  order_prefix: { required: true, pattern: /^[A-Z0-9]{2,8}$/, message: '请输入 2-8 位大写前缀', trigger: 'blur' },
  hmac_secret_env: { required: true, pattern: /^HMAC_SECRET_[A-Z0-9_]{2,32}$/, message: '环境变量名格式无效', trigger: 'blur' },
  store_url: { required: true, pattern: /^https:\/\//, message: '请输入 HTTPS 地址', trigger: 'blur' },
}

const columns: DataTableColumns<ProductRecord> = [
  { title: '代码', key: 'code', width: 100 },
  { title: '名称', key: 'name', width: 120 },
  { title: '形态', key: 'kind', width: 100, render: (row) => row.kind === 'desktop' ? '桌面客户端' : '浏览器扩展' },
  { title: '激活码前缀', key: 'code_prefix', width: 120 },
  { title: '订单前缀', key: 'order_prefix', width: 110 },
  { title: '密钥变量', key: 'hmac_secret_env', width: 190 },
  { title: '购买地址', key: 'store_url', width: 250, ellipsis: { tooltip: true } },
  { title: '状态', key: 'is_active', width: 80, render: (row) => h(NTag, { type: row.is_active ? 'success' : 'default', size: 'small' }, { default: () => row.is_active ? '启用' : '停用' }) },
  { title: '操作', key: 'actions', width: 90, render: (row) => h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }) },
]

function assignForm(value: ProductParams) {
  Object.assign(form, value)
}

function openCreate() {
  editingCode.value = ''
  assignForm(emptyForm())
  showModal.value = true
}

function openEdit(row: ProductRecord) {
  editingCode.value = row.code
  assignForm({
    code: row.code, name: row.name, kind: row.kind, code_prefix: row.code_prefix,
    order_prefix: row.order_prefix, hmac_secret_env: row.hmac_secret_env,
    store_url: row.store_url, support_email: row.support_email ?? '',
    is_active: row.is_active, sort_order: row.sort_order,
  })
  showModal.value = true
}

async function submit() {
  try {
    await formRef.value?.validate()
  } catch {
    return false
  }
  try {
    if (editingCode.value) await updateProduct(editingCode.value, { ...form })
    else await createProduct({ ...form })
    await productStore.loadProducts()
    showModal.value = false
    message.success('产品配置已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
  return false
}
</script>
