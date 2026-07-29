<template>
  <UiModal
    :model-value="modelValue"
    :title="course?.title || 'Уроки курса'"
    eyebrow="Программа курса"
    width="760px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="course-lessons">
      <div v-if="loading" class="course-lessons__state">
        <UiIcon name="refresh" />
        <span>Загружаем уроки…</span>
      </div>

      <div v-else-if="error" class="course-lessons__state course-lessons__state--error">
        <UiIcon name="warning" />
        <strong>{{ error }}</strong>
        <UiButton size="sm" variant="secondary" icon="refresh" @click="$emit('retry')">Повторить</UiButton>
      </div>

      <template v-else-if="lessons.length">
        <header class="course-lessons__summary">
          <span><img src="/images/integrations/courses-icon.svg" alt=""></span>
          <div>
            <strong>{{ lessons.length }} уроков</strong>
            <p>Открытие урока не создаёт событий и ничего не меняет в календаре.</p>
          </div>
          <UiInput
            v-if="lessons.length > 6"
            v-model="search"
            type="search"
            placeholder="Найти урок"
            aria-label="Найти урок"
          />
        </header>

        <div class="course-lessons__list">
          <article v-for="lesson in filteredLessons" :key="lesson.id">
            <span>{{ lesson.lessonPosition }}</span>
            <div>
              <small>{{ lesson.moduleTitle || 'Урок' }}</small>
              <strong>{{ lesson.title }}</strong>
              <p>{{ lesson.durationMinutes }} минут</p>
            </div>
            <a
              v-if="isHttpUrl(lesson.url)"
              :href="lesson.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              Открыть
              <UiIcon name="right" />
            </a>
          </article>
        </div>

        <div v-if="!filteredLessons.length" class="course-lessons__state">
          <UiIcon name="search" />
          <span>По вашему запросу уроков нет</span>
        </div>
      </template>

      <div v-else class="course-lessons__state">
        <UiIcon name="play" />
        <span>В этом курсе пока нет опубликованных уроков.</span>
      </div>
    </div>
  </UiModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import UiButton from '../../../../components/ui/UiButton.vue'
import UiIcon from '../../../../components/ui/UiIcon.vue'
import UiInput from '../../../../components/ui/UiInput.vue'
import UiModal from '../../../../components/ui/UiModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  course: { type: Object, default: null },
  manifest: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'retry'])

const search = ref('')
const lessons = computed(() => props.manifest?.lessons || [])
const filteredLessons = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  if (!query) return lessons.value
  return lessons.value.filter((lesson) => (
    `${lesson.title || ''} ${lesson.moduleTitle || ''}`
      .toLocaleLowerCase('ru-RU')
      .includes(query)
  ))
})

watch(() => props.course?.id, () => {
  search.value = ''
})

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}
</script>

<style scoped>
.course-lessons{display:grid;gap:13px}.course-lessons__summary{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(180px,240px);align-items:center;gap:11px;border:1px solid color-mix(in srgb,#34d399 22%,var(--border-color));border-radius:14px;padding:11px;background:color-mix(in srgb,#34d399 6%,var(--control-bg))}.course-lessons__summary>span{display:grid;place-items:center;width:44px;height:44px;overflow:hidden;border-radius:12px;background:#062518}.course-lessons__summary img{width:100%;height:100%;object-fit:cover}.course-lessons__summary strong{display:block}.course-lessons__summary p{margin:3px 0 0;color:var(--text-muted);font-size:10px}.course-lessons__list{display:grid;gap:7px;max-height:460px;overflow:auto}.course-lessons__list article{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:13px;padding:9px 10px;background:var(--card-bg)}.course-lessons__list article>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;color:#34d399;background:color-mix(in srgb,#34d399 10%,var(--control-bg));font-size:11px;font-weight:850}.course-lessons__list small,.course-lessons__list strong,.course-lessons__list p{display:block}.course-lessons__list small{margin-bottom:2px;color:#34d399;font-size:8px;font-weight:800;text-transform:uppercase}.course-lessons__list p{margin:3px 0 0;color:var(--text-muted);font-size:9px}.course-lessons__list a{display:flex;align-items:center;gap:5px;border:1px solid var(--border-color);border-radius:999px;padding:8px 11px;color:var(--text-primary);background:var(--control-bg);font-size:10px;font-weight:700;text-decoration:none}.course-lessons__list a:hover{border-color:color-mix(in srgb,#34d399 40%,var(--border-color));color:#34d399}.course-lessons__state{display:grid;justify-items:center;align-content:center;gap:8px;min-height:220px;color:var(--text-muted);text-align:center}.course-lessons__state>svg{font-size:24px}.course-lessons__state--error{color:var(--danger)}@media(max-width:600px){.course-lessons__summary{grid-template-columns:40px 1fr}.course-lessons__summary>.ui-input{grid-column:1/-1}.course-lessons__list article{grid-template-columns:32px minmax(0,1fr)}.course-lessons__list a{grid-column:1/-1;justify-content:center}}
</style>
