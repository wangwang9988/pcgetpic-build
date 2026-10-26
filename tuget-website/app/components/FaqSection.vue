<template>
  <div class="faq-grid">
    <div v-for="(item, idx) in faqs" :key="idx" class="faq-card">
      <h3>{{ item.question }}</h3>
      <p>{{ item.answer }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface FaqItem {
  question: string
  answer: string
}

defineProps<{
  faqs: FaqItem[]
}>()
</script>

<style scoped>
.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.faq-card {
  padding: 28px;
  background-color: #ffffff;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
  transition: border-color 0.15s ease;
}

.faq-card:hover {
  border-color: var(--border-medium);
}

.faq-card h3 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.45;
}

.faq-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.65;
}

@media (max-width: 768px) {
  .faq-grid {
    grid-template-columns: 1fr;
  }
}
</style>
