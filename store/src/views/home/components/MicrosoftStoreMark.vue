<template>
  <span
    class="microsoft-store-mark"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <span class="mark-square mark-red"></span>
    <span class="mark-square mark-green"></span>
    <span class="mark-square mark-blue"></span>
    <span class="mark-square mark-yellow"></span>
  </span>
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 1px;
  flex: 0 0 auto;
}

.mark-square {
  display: block;
  border-radius: 1px;
}

.mark-red {
  background: #f25022;
}

.mark-green {
  background: #7fba00;
}

.mark-blue {
  background: #00a4ef;
}

.mark-yellow {
  background: #ffb900;
}
</style>
