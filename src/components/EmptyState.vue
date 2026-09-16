<script setup lang="ts">
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  { icon: 'page' },
)
</script>

<template>
  <div class="empty">
    <div class="empty__mark">
      <AppIcon :name="icon" :size="22" />
    </div>
    <p class="empty__title">{{ title }}</p>
    <p v-if="description" class="empty__desc">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed var(--hairline);
  border-radius: var(--r-lg);
}

.empty__mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--r-md);
  border: 1px solid var(--hairline);
  background: var(--glass);
  color: var(--ink-mute);
}

.empty__title {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
}

.empty__desc {
  max-width: 46ch;
  font-size: 0.88rem;
  color: var(--ink-mute);
  line-height: 1.7;
}
</style>
