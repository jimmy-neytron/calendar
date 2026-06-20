<template>
  <section class="settings-section-card" :class="`settings-section-card--${tone}`">
    <header class="settings-section-card__header">
      <span class="settings-section-card__icon" aria-hidden="true">{{ icon }}</span>
      <div>
        <small>{{ eyebrow }}</small>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.status" class="settings-section-card__status">
        <slot name="status" />
      </div>
    </header>

    <div class="settings-section-card__body">
      <slot />
    </div>

    <footer v-if="$slots.actions" class="settings-section-card__footer">
      <slot name="actions" />
    </footer>
  </section>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '✦' },
  eyebrow: { type: String, default: 'Настройки' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tone: {
    type: String,
    default: 'neutral',
    validator: (value) => ['neutral', 'accent', 'success', 'warning'].includes(value),
  },
})
</script>

<style scoped>
.settings-section-card {
  --card-accent: var(--text-secondary);
  display: grid;
  gap: 16px;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 20px;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--card-accent) 8%, transparent), transparent 240px),
    var(--card-solid);
  box-shadow:
    var(--shadow-sm),
    inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
}

.settings-section-card--accent { --card-accent: var(--info); }
.settings-section-card--success { --card-accent: var(--success); }
.settings-section-card--warning { --card-accent: var(--warning); }

.settings-section-card__header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.settings-section-card__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid color-mix(in srgb, var(--card-accent) 24%, var(--border-color));
  border-radius: 12px;
  color: var(--card-accent);
  background: color-mix(in srgb, var(--card-accent) 9%, var(--control-bg));
  font-size: 17px;
  font-weight: 900;
}

.settings-section-card__header small {
  display: block;
  margin-bottom: 2px;
  color: var(--card-accent);
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.settings-section-card__header h2 {
  margin: 0;
  font-size: 17px;
}

.settings-section-card__header p {
  max-width: 680px;
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.settings-section-card__body {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.settings-section-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 620px) {
  .settings-section-card {
    padding: 14px;
  }

  .settings-section-card__header {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .settings-section-card__status {
    grid-column: 2;
  }

  .settings-section-card__footer {
    display: grid;
    grid-template-columns: 1fr;
  }

  .settings-section-card__footer :deep(.ui-button),
  .settings-section-card__footer :deep(.upload-button) {
    width: 100%;
  }
}
</style>
