<template>
  <n-layout has-sider style="height: 100vh">
    <!-- 桌面端侧边栏 -->
    <n-layout-sider
      v-if="!isMobile"
      bordered
      :width="220"
      :collapsed-width="64"
      collapse-mode="width"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <!-- 侧边栏顶部工作区/产品切换器 -->
      <div class="sider-workspace-header" :class="{ collapsed }">
        <!-- 折叠态：点击头像直接一键循环切换下一个产品 -->
        <div v-if="collapsed" class="collapsed-trigger-wrap">
          <n-tooltip placement="right" trigger="hover">
            <template #trigger>
              <div
                class="product-avatar collapsed-avatar"
                :style="{ background: currentProduct.iconUrl ? 'transparent' : currentProduct.bgGradient }"
                @click="handleQuickNextProduct"
              >
                <img
                  v-if="currentProduct.iconUrl"
                  :src="currentProduct.iconUrl"
                  :alt="currentProduct.shortName"
                  class="product-avatar-img"
                />
                <span v-else>{{ currentProduct.avatarText }}</span>
              </div>
            </template>
            <span>当前：{{ currentProduct.shortName }}（点击切换至：{{ nextProductName }}）</span>
          </n-tooltip>
        </div>

        <!-- 展开态：分体式复合卡片 -->
        <div v-else class="workspace-trigger-card">
          <!-- 左侧主体区域：单击一键即切下一个产品 -->
          <div
            class="workspace-main"
            :title="`点击直接切换至：${nextProductName}`"
            @click="handleQuickNextProduct"
          >
            <div
              class="product-avatar"
              :style="{ background: currentProduct.iconUrl ? 'transparent' : currentProduct.bgGradient }"
            >
              <img
                v-if="currentProduct.iconUrl"
                :src="currentProduct.iconUrl"
                :alt="currentProduct.shortName"
                class="product-avatar-img"
              />
              <span v-else>{{ currentProduct.avatarText }}</span>
            </div>
            <div class="product-details">
              <div class="product-title-row">
                <span class="product-title">{{ currentProduct.shortName }}</span>
              </div>
              <span class="workspace-sub">切至: {{ nextProductName }}</span>
            </div>
            <n-icon :size="13" class="quick-switch-icon">
              <SwapVerticalOutline />
            </n-icon>
          </div>

          <!-- 右侧独立下拉箭头：点击展开全部产品列表 -->
          <n-dropdown
            trigger="click"
            placement="bottom-end"
            :options="productDropdownOptions"
            @select="handleDropdownSelect"
          >
            <div class="dropdown-trigger-btn" title="查看并选择全部产品">
              <n-icon :size="14" class="arrow-icon">
                <ChevronDownOutline />
              </n-icon>
            </div>
          </n-dropdown>
        </div>
      </div>

      <n-menu
        :value="activeKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :default-expanded-keys="defaultExpandedKeys"
        :options="menuOptions"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <!-- 移动端抽屉菜单 -->
    <n-drawer v-model:show="drawerVisible" :width="240" placement="left">
      <n-drawer-content
        :native-scrollbar="false"
        :header-style="{ padding: '10px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.09)' }"
      >
        <template #header>
          <div class="mobile-workspace-card">
            <!-- 移动端左侧主体：单击一键切换下一个 -->
            <div class="workspace-main" @click="handleQuickNextProduct">
              <div
                class="product-avatar"
                :style="{ background: currentProduct.iconUrl ? 'transparent' : currentProduct.bgGradient }"
              >
                <img
                  v-if="currentProduct.iconUrl"
                  :src="currentProduct.iconUrl"
                  :alt="currentProduct.shortName"
                  class="product-avatar-img"
                />
                <span v-else>{{ currentProduct.avatarText }}</span>
              </div>
              <div class="product-details">
                <div class="product-title-row">
                  <span class="product-title">{{ currentProduct.shortName }}</span>
                  <n-tag size="tiny" :bordered="false" round class="product-code-tag">
                    {{ currentProduct.code }}
                  </n-tag>
                </div>
                <span class="workspace-sub">切至: {{ nextProductName }}</span>
              </div>
              <n-icon :size="13" class="quick-switch-icon">
                <SwapVerticalOutline />
              </n-icon>
            </div>

            <!-- 移动端右侧下拉箭头 -->
            <n-dropdown
              trigger="click"
              placement="bottom-end"
              :options="productDropdownOptions"
              @select="handleDropdownSelect"
            >
              <div class="dropdown-trigger-btn" title="查看并选择全部产品">
                <n-icon :size="15" class="arrow-icon">
                  <ChevronDownOutline />
                </n-icon>
              </div>
            </n-dropdown>
          </div>
        </template>
        <n-menu
          :value="activeKey"
          :default-expanded-keys="defaultExpandedKeys"
          :options="menuOptions"
          @update:value="handleMobileMenuSelect"
        />
      </n-drawer-content>
    </n-drawer>

    <n-layout>
      <!-- 顶部头部栏 -->
      <n-layout-header bordered class="app-header">
        <div class="header-left">
          <n-button v-if="isMobile" quaternary size="small" @click="drawerVisible = true">
            <template #icon><n-icon :size="20"><MenuOutline /></n-icon></template>
          </n-button>
          <div v-if="!isMobile" class="header-breadcrumb">
            <span class="system-badge">激活系统管理后台</span>
            <span class="breadcrumb-separator">/</span>
            <span class="current-view-title">{{ currentViewTitle }}</span>
          </div>
          <div v-else class="mobile-header-title">
            {{ currentViewTitle }}
          </div>
        </div>

        <div class="header-right">
          <div class="user-pill">
            <n-avatar round :size="26" class="user-avatar">
              {{ authStore.username?.slice(0, 1).toUpperCase() || 'A' }}
            </n-avatar>
            <span class="username">{{ authStore.username }}</span>
          </div>
          <n-divider vertical class="header-divider" />
          <n-button quaternary size="small" type="error" class="logout-btn" @click="handleLogout">
            <template #icon><n-icon :size="15"><LogOutOutline /></n-icon></template>
            退出
          </n-button>
        </div>
      </n-layout-header>

      <!-- 内容区域 -->
      <n-layout-content :style="{ padding: isMobile ? '12px' : '24px', overflow: 'auto', minWidth: 0 }">
        <router-view :key="route.meta.global ? route.path : `${route.fullPath}:${productStore.activeProduct}`" />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, Component, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon, useMessage, type DropdownOption } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  SpeedometerOutline as DashboardIcon,
  AnalyticsOutline as AnalyticsIcon,
  TrashOutline as UninstallIcon,
  DesktopOutline as ClientIcon,
  KeyOutline as CodeIcon,
  ReceiptOutline as OrderIcon,
  ShieldOutline as KeyIcon,
  GitBranchOutline as ChannelIcon,
  CubeOutline as PackageIcon,
  LayersOutline as ProductIcon,
  ServerOutline as BackupIcon,
  MenuOutline,
  SwapVerticalOutline,
  ChevronDownOutline,
  LogOutOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useProductStore } from '@/stores/product'
import { formatProductName } from '@/utils/product'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const productStore = useProductStore()
const message = useMessage()

const collapsed = ref(false)
const drawerVisible = ref(false)
const isMobile = ref(false)
const defaultExpandedKeys = ['PluginStatistics', 'ClientData']

/** 响应式监听窗口宽度 */
const MOBILE_BREAKPOINT = 768
let mediaQuery: MediaQueryList | null = null

function updateMobileState(e: MediaQueryListEvent | MediaQueryList) {
  isMobile.value = e.matches
  // 切换到桌面端时关闭抽屉
  if (!e.matches) drawerVisible.value = false
}

onMounted(() => {
  mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
  updateMobileState(mediaQuery)
  addMediaQueryListener(mediaQuery)
  productStore.loadProducts().catch((error: { response?: { status?: number } }) => {
    // Expired sessions are redirected by the shared API interceptor.
    if (error.response?.status !== 401) message.error('产品列表加载失败，请刷新页面重试')
  })
})

onUnmounted(() => {
  if (mediaQuery) removeMediaQueryListener(mediaQuery)
})

function addMediaQueryListener(query: MediaQueryList) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', updateMobileState)
    return
  }
  query.addListener(updateMobileState)
}

function removeMediaQueryListener(query: MediaQueryList) {
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', updateMobileState)
    return
  }
  query.removeListener(updateMobileState)
}

/** 当前激活的菜单项 */
const activeKey = computed(() => route.name as string)

/** 页面标题对照映射 */
const PAGE_TITLES: Record<string, string> = {
  Dashboard: '仪表盘',
  PluginAnalytics: '插件数据总览',
  PluginNewtab: '新标签页统计',
  PluginSearch: '搜索页统计',
  PluginUninstall: '插件卸载分析',
  ClientAnalytics: '客户端统计',
  ClientErrors: '客户端错误',
  Feedbacks: '工单反馈',
  Codes: '激活码管理',
  Orders: '订单管理',
  Keys: '密钥管理',
  Channels: '渠道管理',
  Packages: '套餐管理',
  Products: '产品管理',
  Backups: '数据库备份',
}

const currentViewTitle = computed(() => {
  return PAGE_TITLES[activeKey.value] || (route.meta?.title as string) || '控制台'
})

interface ProductConfig {
  shortName: string
  fullName: string
  code: string
  color: string
  bgGradient: string
  avatarText: string
  iconUrl?: string
}

/** 产品代码视觉配置映射 */
const PRODUCT_CONFIGS: Record<string, ProductConfig> = {
  dangtu: {
    shortName: '当图',
    fullName: '当图/DownPictures',
    code: 'dangtu',
    color: '#18a058',
    bgGradient: 'linear-gradient(135deg, #18a058 0%, #0c7a43 100%)',
    avatarText: '当',
    iconUrl: '/icons/dangtu.png',
  },
  tuget: {
    shortName: '图个吉利',
    fullName: '图个吉利/TuGet',
    code: 'tuget',
    color: '#f0a020',
    bgGradient: 'linear-gradient(135deg, #f0a020 0%, #d48210 100%)',
    avatarText: '吉',
    iconUrl: '/icons/tuget.png',
  },
}

/** 活跃产品列表 */
const activeProductList = computed(() => {
  if (productStore.products && productStore.products.length > 0) {
    const activeList = productStore.products.filter((p) => p.is_active === 1)
    return activeList.length > 0 ? activeList : productStore.products
  }
  return [
    { code: 'dangtu', name: '当图' },
    { code: 'tuget', name: '图个吉利' },
  ]
})

/** 下一个产品的简短名称（用于提示和单次点击轮转） */
const nextProductName = computed(() => {
  const list = activeProductList.value
  if (!list.length) return ''
  const currentIdx = list.findIndex((item) => item.code === productStore.activeProduct)
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % list.length
  const nextItem = list[nextIdx]
  const cfg = PRODUCT_CONFIGS[nextItem.code]
  return cfg ? cfg.shortName : (nextItem.name || nextItem.code)
})

/** 当前选中产品配置 */
const currentProduct = computed<ProductConfig>(() => {
  const code = productStore.activeProduct
  if (PRODUCT_CONFIGS[code]) {
    return PRODUCT_CONFIGS[code]
  }
  const found = productStore.products?.find((p) => p.code === code)
  const name = found?.name || code || '激活系统'
  return {
    shortName: name,
    fullName: formatProductName(code, found?.name),
    code: code || '',
    color: '#63e2b7',
    bgGradient: 'linear-gradient(135deg, #2a3b4c 0%, #1e293b 100%)',
    avatarText: name.slice(0, 1) || 'P',
  }
})

/** 单击一键轮转切换到下一个产品（开关/循环效果） */
function handleQuickNextProduct() {
  const list = activeProductList.value
  if (!list.length) return
  const currentIdx = list.findIndex((item) => item.code === productStore.activeProduct)
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % list.length
  productStore.setActiveProduct(list[nextIdx].code)
}

/** 产品下拉选项（供右侧箭头展开全部选择） */
const productDropdownOptions = computed<DropdownOption[]>(() => {
  const list = activeProductList.value

  const options: DropdownOption[] = list.map((item) => {
    const isCurrent = productStore.activeProduct === item.code
    const cfg = PRODUCT_CONFIGS[item.code]
    const label = cfg?.fullName || formatProductName(item.code, item.name)
    return {
      label,
      key: `product:${item.code}`,
      icon: () => {
        if (cfg?.iconUrl) {
          return h('img', {
            src: cfg.iconUrl,
            alt: cfg.shortName,
            style: {
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              objectFit: 'contain',
              display: 'block',
            },
          })
        }
        return h('span', {
          style: {
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isCurrent ? (cfg?.color || '#18a058') : 'rgba(255,255,255,0.25)',
            boxShadow: isCurrent ? `0 0 6px ${cfg?.color || '#18a058'}` : 'none',
          },
        })
      },
      disabled: isCurrent,
    }
  })

  options.push(
    { type: 'divider', key: 'd1' },
    {
      label: '管理所有产品',
      key: 'action:manage-products',
      icon: renderIcon(ProductIcon),
    }
  )

  return options
})

function handleDropdownSelect(key: string) {
  if (key.startsWith('product:')) {
    const code = key.replace('product:', '')
    productStore.setActiveProduct(code)
  } else if (key === 'action:manage-products') {
    navigateToMenuItem('Products')
  }
}

/** 渲染图标辅助函数 */
function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

/** 侧边栏菜单配置 */
const menuOptions: MenuOption[] = [
  { label: '仪表盘', key: 'Dashboard', icon: renderIcon(DashboardIcon) },
  {
    label: '插件统计',
    key: 'PluginStatistics',
    icon: renderIcon(AnalyticsIcon),
    children: [
      { label: '数据总览', key: 'PluginAnalytics' },
      { label: '新标签页', key: 'PluginNewtab' },
      { label: '搜索页', key: 'PluginSearch' },
      { label: '卸载分析', key: 'PluginUninstall', icon: renderIcon(UninstallIcon) },
    ],
  },
  {
    label: '客户端',
    key: 'ClientData',
    icon: renderIcon(ClientIcon),
    children: [
      { label: '使用统计', key: 'ClientAnalytics' },
      { label: '错误日志', key: 'ClientErrors' },
      { label: '工单反馈', key: 'Feedbacks' },
    ],
  },
  { label: '激活码管理', key: 'Codes', icon: renderIcon(CodeIcon) },
  { label: '订单管理', key: 'Orders', icon: renderIcon(OrderIcon) },
  { label: '密钥管理', key: 'Keys', icon: renderIcon(KeyIcon) },
  { label: '渠道管理', key: 'Channels', icon: renderIcon(ChannelIcon) },
  { label: '套餐管理', key: 'Packages', icon: renderIcon(PackageIcon) },
  { label: '产品管理', key: 'Products', icon: renderIcon(ProductIcon) },
  { label: '数据库备份', key: 'Backups', icon: renderIcon(BackupIcon) },
]

function handleMenuSelect(key: string) {
  return navigateToMenuItem(key)
}

/** 移动端菜单选择后自动关闭抽屉 */
async function handleMobileMenuSelect(key: string) {
  try {
    await navigateToMenuItem(key)
  } finally {
    // 关闭抽屉前先移走焦点，避免 aria-hidden 警告
    ;(document.activeElement as HTMLElement | null)?.blur()
    drawerVisible.value = false
  }
}

function navigateToMenuItem(key: string) {
  if (route.name === key) return Promise.resolve()
  return router.push({ name: key })
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
/* 侧边栏顶部工作区切换卡片容器 */
.sider-workspace-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  box-sizing: border-box;
}

.sider-workspace-header.collapsed {
  padding: 0;
  justify-content: center;
}

.collapsed-trigger-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.collapsed-avatar {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.collapsed-avatar:hover {
  transform: scale(1.08);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.collapsed-avatar:active {
  transform: scale(0.95);
}

/* 分体式复合按钮卡片 */
.workspace-trigger-card,
.mobile-workspace-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 3px 4px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.workspace-trigger-card:hover,
.mobile-workspace-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
}

/* 左侧主体快速切换区域（点一下即切） */
.workspace-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease, transform 0.1s ease;
}

.workspace-main:hover {
  background: rgba(255, 255, 255, 0.07);
}

.workspace-main:active {
  transform: scale(0.98);
}

.product-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13.5px;
  color: #ffffff;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  letter-spacing: -0.5px;
}

.product-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
  display: block;
}

.product-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.product-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.product-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-code-tag {
  font-size: 9.5px;
  background: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.6) !important;
  padding: 0 3px;
  height: 15px;
  line-height: 15px;
}

.workspace-sub {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.42);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-switch-icon {
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.workspace-main:hover .quick-switch-icon {
  color: rgba(255, 255, 255, 0.85);
  transform: rotate(180deg);
}

/* 右侧独立下拉触发按钮（点箭头展开全部） */
.dropdown-trigger-btn {
  width: 22px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dropdown-trigger-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.95);
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.dropdown-trigger-btn:active .arrow-icon {
  transform: scale(0.9);
}

/* 顶部头部栏整体样式 */
.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
}

.system-badge {
  color: rgba(255, 255, 255, 0.45);
  font-weight: 400;
}

.breadcrumb-separator {
  color: rgba(255, 255, 255, 0.2);
}

.current-view-title {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 500;
}

.mobile-header-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px 3px 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.user-avatar {
  background: linear-gradient(135deg, #18a058, #0c7a43);
  color: #ffffff;
  font-weight: 600;
  font-size: 12px;
}

.username {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.header-divider {
  margin: 0 4px;
  height: 16px;
  opacity: 0.15;
}

.logout-btn {
  border-radius: 6px;
  font-size: 13px;
}
</style>
