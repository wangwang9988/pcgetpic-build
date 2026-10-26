<template>
  <PlatformLandingPage :content="content" />
</template>

<script setup lang="ts">
import { getPlatformPageContent } from '~/data/platformPages'

const { locale } = useI18n()
const content = computed(() => getPlatformPageContent('1688', locale.value))
</script>
