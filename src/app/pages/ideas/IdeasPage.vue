<template>
  <section class="ideas-page">
    <header class="ideas-hero panel">
      <div>
        <span>Копилка идей</span>
        <h1>Что бы поделать?</h1>
        <p>Сохраняй спонтанные планы, а когда появится время — отправляй их в календарь.</p>
      </div>
      <strong>{{ ideas.length }}</strong>
      <small>{{ ideaWord }}</small>
    </header>

    <section class="idea-create panel">
      <UiInput v-model="form.title" label="Новая идея" placeholder="Сходить в музей, устроить пикник…" @keydown.enter="createIdea" />
      <label>
        <span>Тип</span>
        <UiSelect v-model="form.type">
          <option v-for="type in IDEA_TYPES" :key="type.value" :value="type.value">{{ type.icon }} {{ type.label }}</option>
        </UiSelect>
      </label>
      <UiInput v-model="form.note" label="Заметка" placeholder="Почему это интересно?" />
      <UiButton icon="＋" @click="createIdea">Сохранить</UiButton>
    </section>

    <nav class="idea-filters">
      <button v-for="filter in filters" :key="filter.value" type="button" :class="{ active: activeFilter === filter.value }" @click="activeFilter = filter.value">
        {{ filter.label }}
      </button>
      <button type="button" class="idea-filters__random" :disabled="!filteredIdeas.length" @click="pickRandom">✦ Случайная идея</button>
    </nav>

    <div v-if="randomIdea" class="random-idea panel">
      <span>{{ typeMeta(randomIdea.type).icon }}</span>
      <div><small>Почему бы не…</small><strong>{{ randomIdea.title }}</strong><p v-if="randomIdea.note">{{ randomIdea.note }}</p></div>
      <UiButton size="sm" @click="openPlanner(randomIdea)">Запланировать</UiButton>
      <UiIconButton icon="close" label="Закрыть" @click="randomIdea = null" />
    </div>

    <CollectionViewControls
      v-model:view-mode="viewMode"
      v-model:page-size="pageSize"
      :total="filteredIdeas.length"
      :range-start="rangeStart"
      :range-end="rangeEnd"
    />

    <div v-if="viewMode === 'cards'" class="idea-grid">
      <article v-for="idea in pagedIdeas" :key="idea.id" class="idea-card" :class="{ 'idea-card--planned': idea.plannedEventId }">
        <header>
          <span>{{ typeMeta(idea.type).icon }}</span>
          <small>{{ typeMeta(idea.type).label }}</small>
          <UiIconButton icon="trash" label="Удалить идею" size="sm" variant="danger" @click="ideaStore.removeIdea(idea.id)" />
        </header>
        <strong>{{ idea.title }}</strong>
        <p>{{ idea.note || 'Без заметки — просто хорошая идея.' }}</p>
        <footer>
          <span v-if="idea.plannedEventId">✓ Уже в календаре</span>
          <UiButton v-if="!idea.plannedEventId" size="sm" variant="secondary" @click="openPlanner(idea)">В календарь</UiButton>
          <button v-else type="button" @click="removeFromCalendar(idea)">Убрать из календаря</button>
        </footer>
      </article>

      <div v-if="!filteredIdeas.length" class="ideas-empty">
        <span>✦</span><strong>Здесь пока пусто</strong><p>Запиши первую идею — даже самую маленькую.</p>
      </div>
    </div>

    <div v-else-if="filteredIdeas.length" class="idea-table-wrap">
      <table class="idea-table">
        <thead><tr><th>Тип</th><th>Идея</th><th>Заметка</th><th>Статус</th><th>Действия</th></tr></thead>
        <tbody>
          <tr v-for="idea in pagedIdeas" :key="idea.id">
            <td><span class="idea-table__type">{{ typeMeta(idea.type).icon }} {{ typeMeta(idea.type).label }}</span></td>
            <td><strong>{{ idea.title }}</strong></td>
            <td><span class="idea-table__note">{{ idea.note || 'Без заметки' }}</span></td>
            <td><span :class="['idea-table__status', { planned: idea.plannedEventId }]">{{ idea.plannedEventId ? 'В календаре' : 'Не запланирована' }}</span></td>
            <td>
              <div class="idea-table__actions">
                <UiButton v-if="!idea.plannedEventId" size="sm" variant="secondary" @click="openPlanner(idea)">В календарь</UiButton>
                <UiButton v-else size="sm" variant="ghost" @click="removeFromCalendar(idea)">Убрать</UiButton>
                <UiIconButton icon="trash" label="Удалить идею" size="sm" variant="danger" @click="ideaStore.removeIdea(idea.id)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="ideas-empty"><span>✦</span><strong>Здесь пока пусто</strong><p>Запиши первую идею — даже самую маленькую.</p></div>

    <CollectionPagination :page="page" :page-count="pageCount" @change="goToPage" />

    <UiModal v-model="isPlannerOpen" title="Запланировать идею" eyebrow="Копилка идей" width="420px">
      <div class="idea-planner">
        <strong>{{ planningIdea?.title }}</strong>
        <div><UiInput v-model="planDate" type="date" label="Дата" /><UiInput v-model="planTime" type="time" label="Время" /></div>
        <footer><UiButton variant="secondary" @click="isPlannerOpen = false">Отмена</UiButton><UiButton @click="confirmPlan">Добавить в календарь</UiButton></footer>
      </div>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import CollectionPagination from '../../components/collections/CollectionPagination.vue'
import CollectionViewControls from '../../components/collections/CollectionViewControls.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import UiIconButton from '../../components/ui/UiIconButton.vue'
import { ideaStore } from '../../stores/idea.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { DateHelper } from '../../utils/date/dateHelper.js'
import { usePaginatedView } from '../../composables/collections/usePaginatedView.js'

const IDEA_TYPES = [
  { value: 'place', label: 'Место', icon: '⌖' },
  { value: 'food', label: 'Еда', icon: '◌' },
  { value: 'movie', label: 'Фильм', icon: '▶' },
  { value: 'activity', label: 'Активность', icon: '↗' },
  { value: 'family', label: 'Семья', icon: '♡' },
  { value: 'other', label: 'Другое', icon: '✦' },
]

const { notify } = useNotification()
const ideas = ideaStore.ideas
const form = reactive({ title: '', type: 'other', note: '' })
const activeFilter = ref('all')
const randomIdea = ref(null)
const isPlannerOpen = ref(false)
const planningIdea = ref(null)
const planDate = ref(DateHelper.toKey(new Date()))
const planTime = ref('12:00')
const filters = computed(() => [{ value: 'all', label: 'Все' }, ...IDEA_TYPES.filter((type) => ideas.value.some((idea) => idea.type === type.value))])
const filteredIdeas = computed(() => activeFilter.value === 'all' ? ideas.value : ideas.value.filter((idea) => idea.type === activeFilter.value))
const {
  viewMode, pageSize, page, pageCount, pagedItems: pagedIdeas,
  rangeStart, rangeEnd, goToPage, resetPage,
} = usePaginatedView(filteredIdeas, 'ideas')
const ideaWord = computed(() => pluralize(ideas.value.length, ['идея', 'идеи', 'идей']))

watch(activeFilter, resetPage)

function createIdea() {
  const result = ideaStore.addIdea(form)
  if (!result.ok) return notify(result.message, 'warning')
  form.title = ''
  form.note = ''
  notify('Идея сохранена', 'success')
}

function pickRandom() {
  randomIdea.value = filteredIdeas.value[Math.floor(Math.random() * filteredIdeas.value.length)] || null
}

function openPlanner(idea) {
  planningIdea.value = idea
  planDate.value = DateHelper.toKey(new Date())
  planTime.value = '12:00'
  isPlannerOpen.value = true
}

async function confirmPlan() {
  const result = await ideaStore.planIdea(planningIdea.value.id, planDate.value, planTime.value)
  notify(result.ok ? 'Идея добавлена в календарь' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) {
    isPlannerOpen.value = false
    randomIdea.value = null
  }
}

async function removeFromCalendar(idea) {
  await ideaStore.unplanIdea(idea.id)
  notify('Событие удалено из календаря', 'info')
}

function typeMeta(type) {
  return IDEA_TYPES.find((item) => item.value === type) || IDEA_TYPES.at(-1)
}

function pluralize(value, words) {
  const lastTwo = value % 100
  const last = value % 10
  if (lastTwo >= 11 && lastTwo <= 14) return words[2]
  if (last === 1) return words[0]
  if (last >= 2 && last <= 4) return words[1]
  return words[2]
}
</script>

<style scoped>
.ideas-page{display:grid;gap:14px;padding:14px}.ideas-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:4px 18px;padding:20px}.ideas-hero>div{grid-row:span 2}.ideas-hero span,.idea-create label>span{color:var(--text-muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.11em}.ideas-hero h1{margin:3px 0 6px}.ideas-hero p{max-width:650px;margin:0;color:var(--text-secondary)}.ideas-hero>strong{font-size:36px;line-height:1}.ideas-hero>small{color:var(--text-muted)}
.idea-create{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(140px,.5fr) minmax(220px,1fr) auto;align-items:end;gap:8px;padding:12px}.idea-create label{display:grid;gap:5px}.idea-filters{display:flex;flex-wrap:wrap;gap:6px}.idea-filters button{min-height:30px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:0 11px;color:var(--text-muted);background:var(--control-bg);font-size:11px;font-weight:750}.idea-filters button.active{color:var(--text-inverse);background:var(--accent)}.idea-filters__random{margin-left:auto;color:var(--text-primary)!important}
.random-idea{display:grid;grid-template-columns:46px minmax(0,1fr) auto 26px;align-items:center;gap:12px;padding:14px;border-color:var(--accent-border)}.random-idea>span{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;color:var(--text-inverse);background:var(--accent);font-size:20px}.random-idea small,.random-idea p{color:var(--text-muted)}.random-idea strong{display:block;font-size:17px}.random-idea p{margin:2px 0 0}.random-idea>button{border:0;color:var(--text-muted);background:transparent;font-size:20px}
.idea-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.idea-card{display:grid;align-content:start;gap:8px;min-height:180px;border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:12px;background:var(--card-solid);transition:transform .18s var(--ease-out),border-color .18s var(--ease-out)}.idea-card:hover{transform:translateY(-2px);border-color:var(--border-strong)}.idea-card--planned{border-color:color-mix(in srgb,var(--success) 30%,var(--border-color))}.idea-card header{display:grid;grid-template-columns:28px minmax(0,1fr) 24px;align-items:center;gap:6px}.idea-card header>span{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--control-bg)}.idea-card header small{color:var(--text-muted)}.idea-card header button{border:0;color:var(--danger);background:transparent;font-size:17px}.idea-card>strong{font-size:15px}.idea-card>p{margin:0;color:var(--text-secondary)}.idea-card footer{display:flex;align-items:center;gap:7px;margin-top:auto}.idea-card footer>span{color:var(--success);font-size:10px;font-weight:800}.idea-card footer>button{border:0;padding:0;color:var(--text-muted);background:transparent;font-size:10px}
.ideas-empty{grid-column:1/-1;display:grid;place-items:center;gap:5px;min-height:220px;border:1px dashed var(--border-color);border-radius:var(--radius-xl);color:var(--text-muted);text-align:center}.ideas-empty span{font-size:26px}.ideas-empty p{margin:0}.idea-planner{display:grid;gap:14px}.idea-planner>strong{font-size:17px}.idea-planner>div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.idea-planner footer{display:flex;justify-content:flex-end;gap:7px}
.idea-table-wrap{overflow:auto;border:1px solid var(--border-color);border-radius:var(--radius-xl);background:var(--card-solid)}.idea-table{width:100%;min-width:850px;border-collapse:collapse}.idea-table th{padding:11px 13px;color:var(--text-muted);background:var(--card-soft);font-size:9px;letter-spacing:.08em;text-align:left;text-transform:uppercase}.idea-table td{border-top:1px solid var(--border-color);padding:11px 13px;color:var(--text-secondary);vertical-align:middle}.idea-table tbody tr{transition:background .16s}.idea-table tbody tr:hover{background:var(--control-bg)}.idea-table__type{white-space:nowrap}.idea-table__note{display:block;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.idea-table__status{display:inline-flex;border-radius:var(--radius-pill);padding:4px 7px;color:var(--text-muted);background:var(--control-bg);font-size:9px;font-weight:750;white-space:nowrap}.idea-table__status.planned{color:var(--success);background:color-mix(in srgb,var(--success) 9%,var(--control-bg))}.idea-table__actions{display:flex;justify-content:flex-end;gap:5px;white-space:nowrap}
@media(max-width:960px){.idea-create,.idea-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.ideas-page{padding:10px}.ideas-hero,.idea-create,.idea-grid,.random-idea{grid-template-columns:1fr}.ideas-hero{padding:14px}.idea-filters__random{margin-left:0}}
</style>
