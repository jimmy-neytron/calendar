<template>
  <section class="today-page">
    <UiPageHeader
      eyebrow="Ежедневная сводка"
      :title="capitalizedTodayTitle"
      description="События и важные дела из доступных вам разделов — в одном месте."
    >
      <template #actions>
        <div class="ui-page-header-stat">
          <small>В сводке</small>
          <strong>{{ totalHighlights }}</strong>
          <span>пунктов</span>
        </div>
      </template>
    </UiPageHeader>

    <div class="today-page__grid">
      <TodaySectionCard
        v-for="section in sections"
        :key="section.id"
        v-bind="section"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import TodaySectionCard from '../components/TodaySectionCard.vue'
import { useTodaySections } from '../composables/useTodaySections'

const { sections, todayTitle, totalHighlights } = useTodaySections()
const capitalizedTodayTitle = computed(() => todayTitle.charAt(0).toUpperCase() + todayTitle.slice(1))
</script>

<style scoped>
.today-page {
  display: grid;
  gap: 18px;
  width: min(100%, 1320px);
  margin: 0 auto;
  padding-bottom: 28px;
}

.today-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1100px) {
  .today-page__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 680px) {
  .today-page__grid { grid-template-columns: 1fr; }
}
</style>
