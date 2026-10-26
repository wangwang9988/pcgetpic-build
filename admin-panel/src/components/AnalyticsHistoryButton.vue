<template>
  <n-button @click="router.push({ path: '/analytics-history', query: { source } })">历史归档</n-button>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
defineProps<{ source: string }>()
const router = useRouter()
</script>
