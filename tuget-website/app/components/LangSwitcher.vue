<template>
  <div ref="containerRef" class="lang-switcher">
    <button
      type="button"
      class="lang-trigger"
      :class="[
        `lang-trigger--${variant}`,
        { 'lang-trigger--open': isOpen },
      ]"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click="isOpen = !isOpen"
    >
      <svg class="lang-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      <span>{{ currentLocaleName }}</span>
      <svg
        class="lang-chevron"
        :class="{ 'lang-chevron--open': isOpen }"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="lang-menu"
      :class="`lang-menu--${direction}`"
      role="listbox"
    >
      <NuxtLink
        v-for="loc in availableLocales"
        :key="loc.code"
        :to="switchLocalePath(loc.code)"
        class="lang-option"
        :class="{ 'lang-option--active': loc.code === locale }"
        role="option"
        :aria-selected="loc.code === locale"
        @click="isOpen = false"
      >
        <span>{{ loc.name }}</span>
        <svg
          v-if="loc.code === locale"
          class="lang-check"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { locales } from '~/config/i18n'

withDefaults(defineProps<{
  variant?: 'light' | 'dark'
  direction?: 'down' | 'up'
}>(), {
  variant: 'light',
  direction: 'down',
})

const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const availableLocales = locales

const currentLocaleName = computed(() => {
  const found = availableLocales.find(item => item.code === locale.value)
  return found ? found.name : '简体中文'
})

function handleOutsideClick(event: MouseEvent) {
  if (!isOpen.value) return
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.lang-switcher {
  position: relative;
  display: inline-block;
  text-align: left;
}

.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-sm, 8px);
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lang-trigger--light {
  color: var(--text-secondary, #475569);
  background-color: #ffffff;
  border: 1px solid var(--border-medium, #e2e8f0);
}

.lang-trigger--light:hover,
.lang-trigger--light.lang-trigger--open {
  color: var(--text-primary, #0f172a);
  background-color: var(--bg-subtle, #f8fafc);
  border-color: #cbd5e1;
}

.lang-trigger--dark {
  color: #cbd5e1;
  background-color: #1e293b;
  border: 1px solid #334155;
}

.lang-trigger--dark:hover,
.lang-trigger--dark.lang-trigger--open {
  color: #ffffff;
  background-color: #334155;
  border-color: #475569;
}

.lang-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.lang-chevron {
  flex-shrink: 0;
  opacity: 0.65;
  transition: transform 0.15s ease;
}

.lang-chevron--open {
  transform: rotate(180deg);
}

.lang-menu {
  position: absolute;
  right: 0;
  z-index: 80;
  min-width: 148px;
  padding: 6px;
  background-color: #ffffff;
  border: 1px solid var(--border-medium, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(15, 23, 42, 0.12));
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lang-menu--down {
  top: calc(100% + 6px);
}

.lang-menu--up {
  bottom: calc(100% + 6px);
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-secondary, #475569);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.lang-option:hover {
  background-color: var(--bg-subtle, #f8fafc);
  color: var(--text-primary, #0f172a);
}

.lang-option--active {
  background-color: var(--brand-light, #ecfdf5);
  color: var(--brand-primary, #059669);
  font-weight: 600;
}

.lang-option--active:hover {
  background-color: var(--brand-light, #ecfdf5);
  color: var(--brand-primary, #059669);
}

.lang-check {
  color: var(--brand-primary, #059669);
  flex-shrink: 0;
}
</style>
