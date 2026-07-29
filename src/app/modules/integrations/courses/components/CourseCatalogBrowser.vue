<template>
  <section class="course-catalog">
    <header>
      <div>
        <small>Можно без календаря</small>
        <h2>Курсы и уроки</h2>
        <p>Откройте программу любого курса и переходите к нужному уроку.</p>
      </div>
      <UiInput
        v-if="courses.length > 1"
        v-model="search"
        type="search"
        placeholder="Найти курс"
        aria-label="Найти курс"
      />
    </header>

    <div v-if="filteredCourses.length" class="course-catalog__grid">
      <article
        v-for="course in filteredCourses"
        :key="`${course.id}:${course.releaseId}`"
        :style="{ '--course-color': course.accentColor || '#00dc82' }"
      >
        <span class="course-catalog__cover">
          <img v-if="isHttpUrl(course.coverUrl)" :src="course.coverUrl" alt="">
          <img v-else src="/images/integrations/courses-icon.svg" alt="">
        </span>
        <div class="course-catalog__copy">
          <small>Курс</small>
          <strong>{{ course.title }}</strong>
          <p v-if="course.description">{{ course.description }}</p>
          <span>{{ course.lessonCount }} уроков</span>
        </div>
        <UiButton size="sm" variant="secondary" icon="play" @click="$emit('open', course)">
          Открыть уроки
        </UiButton>
      </article>
    </div>

    <div v-else class="course-catalog__empty">
      <UiIcon name="search" />
      <strong>Курсы не найдены</strong>
      <button type="button" @click="search = ''">Сбросить поиск</button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import UiButton from '../../../../components/ui/UiButton.vue'
import UiIcon from '../../../../components/ui/UiIcon.vue'
import UiInput from '../../../../components/ui/UiInput.vue'

const props = defineProps({
  courses: { type: Array, default: () => [] },
})

defineEmits(['open'])

const search = ref('')
const filteredCourses = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  if (!query) return props.courses
  return props.courses.filter((course) => (
    `${course.title || ''} ${course.description || ''}`
      .toLocaleLowerCase('ru-RU')
      .includes(query)
  ))
})

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}
</script>

<style scoped>
.course-catalog{display:grid;gap:15px;border:1px solid var(--border-color);border-radius:18px;padding:16px;background:var(--panel-bg);box-shadow:var(--shadow-sm)}.course-catalog>header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.course-catalog>header>div{min-width:0}.course-catalog>header>.ui-input{width:min(280px,100%)}.course-catalog header small{color:#34d399;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.course-catalog h2{margin:4px 0}.course-catalog header p{margin:0;color:var(--text-muted);font-size:11px}.course-catalog__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.course-catalog article{display:grid;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:12px;overflow:hidden;border:1px solid var(--border-color);border-radius:15px;padding:10px;background:linear-gradient(145deg,color-mix(in srgb,var(--course-color) 6%,var(--card-bg)),var(--card-bg))}.course-catalog__cover{display:grid;place-items:center;width:58px;height:64px;overflow:hidden;border-radius:13px;background:color-mix(in srgb,var(--course-color) 14%,var(--control-bg))}.course-catalog__cover img{width:100%;height:100%;object-fit:cover}.course-catalog__copy{min-width:0}.course-catalog__copy>small{display:block;margin-bottom:3px;color:var(--course-color);font-size:8px;font-weight:850;text-transform:uppercase}.course-catalog__copy>strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.course-catalog__copy>p{display:-webkit-box;overflow:hidden;margin:4px 0;color:var(--text-muted);font-size:9px;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.course-catalog__copy>span{color:var(--text-secondary);font-size:9px}.course-catalog__empty{display:grid;justify-items:center;gap:6px;border:1px dashed var(--border-color);border-radius:14px;padding:28px;color:var(--text-muted)}.course-catalog__empty svg{font-size:22px}.course-catalog__empty button{border:0;color:#34d399;background:transparent;font-size:10px}@media(max-width:850px){.course-catalog__grid{grid-template-columns:1fr}}@media(max-width:600px){.course-catalog>header{display:grid}.course-catalog article{grid-template-columns:50px minmax(0,1fr)}.course-catalog article>.ui-button{grid-column:1/-1}.course-catalog__cover{width:50px;height:56px}}
</style>
