<template>
  <svg
    class="microsoft-store-mark"
    :width="size"
    :height="size"
    viewBox="0 0 21 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="10" height="10" fill="#f25022" />
    <rect x="11" y="0" width="10" height="10" fill="#7fba00" />
    <rect x="0" y="11" width="10" height="10" fill="#00a4ef" />
    <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
}>(), {
  size: 18
})
</script>

<style scoped>
.microsoft-store-mark {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
}
</style>
