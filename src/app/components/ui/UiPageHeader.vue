<template>
  <header class="ui-page-header">
    <div class="ui-page-header__copy">
      <span v-if="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="ui-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()
</script>

<style scoped>
.ui-page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 4px 2px 20px;
  border-bottom: 1px solid var(--border-color);
}

.ui-page-header__copy {
  min-width: 0;
}

.ui-page-header__copy > span {
  display: block;
  margin-bottom: 5px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.ui-page-header h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 40px);
  font-weight: 720;
  letter-spacing: -.035em;
  line-height: 1.05;
}

.ui-page-header p {
  max-width: 720px;
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.ui-page-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.ui-page-header__actions:deep(.ui-page-header-stat) {
  min-width: 92px;
  display: grid;
  justify-items: end;
  gap: 2px;
  padding-right: 8px;
}

.ui-page-header__actions:deep(.ui-page-header-stat small),
.ui-page-header__actions:deep(.ui-page-header-stat span) {
  color: var(--text-muted);
  font-size: 9px;
}

.ui-page-header__actions:deep(.ui-page-header-stat strong) {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 680px) {
  .ui-page-header {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }

  .ui-page-header__actions {
    justify-content: stretch;
  }

  .ui-page-header__actions:deep(> *) {
    flex: 1;
  }
}
</style>
