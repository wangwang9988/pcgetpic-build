<template>
  <header class="site-header">
    <div class="container nav-wrap">
      <NuxtLink :to="localePath('/')" class="brand-link" :aria-label="t('nav.brandAria')">
        <img src="/tuget-icon.svg" width="36" height="36" alt="TuGet Logo" class="brand-icon">
        <div class="brand-copy">
          <strong>TuGet</strong>
          <small>{{ t('nav.brandSub') }}</small>
        </div>
      </NuxtLink>

      <button
        class="nav-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="site-navigation"
        :aria-label="t('nav.toggleMenu')"
        @click="menuOpen = !menuOpen"
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="site-navigation" :class="['site-nav', { 'site-nav--open': menuOpen }]" :aria-label="t('nav.mainNav')">
        <NuxtLink :to="localePath('/')" class="nav-link" @click="closeMenu">{{ t('nav.home') }}</NuxtLink>
        <NuxtLink :to="localePath('/client/')" class="nav-link" @click="closeMenu">{{ t('nav.client') }}</NuxtLink>

        <!-- 平台支持下拉菜单 -->
        <div ref="dropdownEl" class="nav-dropdown">
          <button
            type="button"
            class="nav-link nav-dropdown-trigger"
            :class="{ 'nav-dropdown-trigger--active': dropdownOpen || isPlatformRoute }"
            :aria-expanded="dropdownOpen"
            aria-haspopup="true"
            @click="toggleDropdown"
          >
            {{ t('nav.platforms') }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <div class="nav-dropdown-menu" :class="{ 'nav-dropdown-menu--open': dropdownOpen }">
            <NuxtLink :to="localePath('/platforms/1688/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.p1688') }}</NuxtLink>
            <NuxtLink :to="localePath('/platforms/taobao/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pTaobao') }}</NuxtLink>
            <NuxtLink :to="localePath('/platforms/jd/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pJd') }}</NuxtLink>
            <NuxtLink :to="localePath('/platforms/vip/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pVip') }}</NuxtLink>
            <NuxtLink :to="localePath('/platforms/pdd/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pPdd') }}</NuxtLink>
            <NuxtLink :to="localePath('/scenarios/media-sniffer/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pMedia') }}</NuxtLink>
            <NuxtLink :to="localePath('/solutions/ecommerce-designer/')" class="nav-dropdown-item" @click="closeDropdown">{{ t('nav.pDesigner') }}</NuxtLink>
          </div>
        </div>

        <NuxtLink :to="localePath('/download/')" class="nav-link" @click="closeMenu">{{ t('nav.download') }}</NuxtLink>

        <div class="nav-actions">
          <LangSwitcher variant="light" direction="down" />
          <a
            :href="microsoftStoreUrl"
            class="button button--store"
            target="_blank"
            rel="noopener"
            @click="handleStoreClick"
          >
            <MicrosoftStoreMark :size="15" />
            <span>{{ t('nav.getClient') }}</span>
          </a>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const menuOpen = ref(false)
const dropdownOpen = ref(false)
const dropdownEl = ref<HTMLElement | null>(null)
const route = useRoute()
const { microsoftStoreUrl, trackStoreClick } = useProductInstallLinks()

// 当前路由命中任一平台专题页时，下拉触发器保持高亮。
const isPlatformRoute = computed(() =>
  route.path.includes('/platforms/')
  || route.path.includes('/scenarios/')
  || route.path.includes('/solutions/')
)

function closeMenu() {
  menuOpen.value = false
  dropdownOpen.value = false
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function closeDropdown() {
  dropdownOpen.value = false
}

// 点击下拉区域外部时收起菜单（触屏与键鼠场景均适用）。
function handleDocumentClick(event: MouseEvent) {
  const el = dropdownEl.value
  if (el && !el.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

function handleStoreClick() {
  trackStoreClick('header_nav')
  closeMenu()
}

watch(() => route.fullPath, closeMenu)

onMounted(() => document.addEventListener('click', handleDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', handleDocumentClick))
</script>

<style scoped>
.site-header {
  position: sticky;
  z-index: 60;
  top: 0;
  background-color: #ffffff;
  border-bottom: 1px solid var(--border-light);
  transition: background-color 0.2s ease;
}

@supports (backdrop-filter: blur(20px)) or (-webkit-backdrop-filter: blur(20px)) {
  .site-header {
    background-color: rgba(255, 255, 255, 0.85);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
  }
}

.nav-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  object-fit: contain;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.15);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-copy strong {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.brand-copy small {
  margin-top: 2px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: var(--bg-subtle);
}

.nav-link.router-link-active {
  color: var(--brand-hover);
  font-weight: 600;
  background-color: transparent;
}

/* 平台支持下拉菜单 */
.nav-dropdown {
  position: relative;
}

.nav-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.nav-dropdown-trigger svg {
  transition: transform 0.15s ease;
}

.nav-dropdown-trigger--active {
  color: var(--brand-hover);
  font-weight: 600;
}

.nav-dropdown-trigger--active svg {
  transform: rotate(180deg);
}

.nav-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  display: flex;
  flex-direction: column;
  min-width: 208px;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
  z-index: 70;
}

.nav-dropdown-menu--open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.nav-dropdown-item {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-dropdown-item:hover {
  color: var(--brand-primary);
  background-color: var(--brand-light);
}

.nav-dropdown-item.router-link-active {
  color: var(--brand-primary);
  font-weight: 600;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 12px;
}

/* 桌面端：悬停 / 键盘聚焦即展开下拉（与点击切换互补） */
@media (hover: hover) and (min-width: 769px) {
  /* 隐形安全桥接层：填补触发按钮与下拉菜单之间的 8px 空隙，防止鼠标移向菜单时因脱离 hover 区域导致菜单瞬时消失 */
  .nav-dropdown-menu::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 0;
    right: 0;
    height: 14px;
  }

  .nav-dropdown:hover .nav-dropdown-menu,
  .nav-dropdown:focus-within .nav-dropdown-menu {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }

  .nav-dropdown:hover .nav-dropdown-trigger,
  .nav-dropdown:focus-within .nav-dropdown-trigger {
    color: var(--brand-hover);
    font-weight: 600;
  }

  .nav-dropdown:hover .nav-dropdown-trigger svg {
    transform: rotate(180deg);
  }
}

.nav-toggle {
  display: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  cursor: pointer;
}

.nav-toggle span {
  display: block;
  width: 18px;
  height: 2px;
  margin: 4px auto;
  background: var(--text-primary);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .nav-toggle {
    display: block;
  }

  .site-nav {
    position: absolute;
    top: 68px;
    left: 16px;
    right: 16px;
    display: none;
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    background-color: #ffffff;
    border: 1px solid var(--border-medium);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
  }

  .site-nav--open {
    display: flex;
  }

  .nav-actions {
    margin-left: 0;
    margin-top: 8px;
    flex-direction: column;
  }

  .nav-actions .button {
    width: 100%;
  }

  /* 移动端：平台支持下拉改为内联展开，避免绝对定位溢出 */
  .nav-dropdown {
    display: flex;
    flex-direction: column;
  }

  .nav-dropdown-trigger {
    justify-content: space-between;
    width: 100%;
    padding: 10px 14px;
    text-align: left;
  }

  .nav-dropdown-menu {
    position: static;
    transform: none;
    min-width: 0;
    margin: 4px 0 8px;
    padding: 4px 0 4px 12px;
    border: none;
    border-left: 2px solid var(--brand-border);
    border-radius: 0;
    box-shadow: none;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .nav-dropdown-menu:not(.nav-dropdown-menu--open) {
    display: none;
  }
}
</style>
