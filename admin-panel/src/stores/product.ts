import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getProducts, type ProductRecord } from '@/api/products'

const STORAGE_KEY = 'admin_active_product'

export const useProductStore = defineStore('product', () => {
  const products = ref<ProductRecord[]>([])
  const activeProduct = ref(localStorage.getItem(STORAGE_KEY) ?? 'dangtu')
  const loading = ref(false)

  const activeProductRecord = computed(() =>
    products.value.find((item) => item.code === activeProduct.value),
  )

  async function loadProducts() {
    loading.value = true
    try {
      const { data } = await getProducts()
      products.value = Array.isArray(data) ? data : []
      if (activeProduct.value && !products.value.some((item) => item.code === activeProduct.value)) {
        setActiveProduct('')
      }
    } finally {
      loading.value = false
    }
  }

  function setActiveProduct(code: string) {
    activeProduct.value = code
    if (code) localStorage.setItem(STORAGE_KEY, code)
    else localStorage.removeItem(STORAGE_KEY)
  }

  return { products, activeProduct, activeProductRecord, loading, loadProducts, setActiveProduct }
})
