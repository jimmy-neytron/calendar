<template>
  <section class="birthdays-page">
    <header class="birthdays-hero panel">
      <div>
        <span>Дни рождения</span>
        <h1>Не забыть важное</h1>
        <p>Возраст, идеи подарков и ежегодные напоминания автоматически связаны с календарём.</p>
      </div>
      <div class="birthdays-hero__next" v-if="nextBirthday">
        <small>Ближайший</small>
        <strong>{{ nextBirthday.name }}</strong>
        <span>{{ countdownLabel(nextBirthday.daysUntil) }}</span>
      </div>
    </header>

    <section class="birthday-create panel">
      <UiInput v-model="form.name" label="Имя" placeholder="Например: Аня" />
      <UiInput v-model="form.birthDate" type="date" label="Дата рождения" />
      <label>
        <span>Напомнить заранее</span>
        <UiSelect v-model.number="form.reminderDays">
          <option :value="0">Только в календаре</option>
          <option :value="3">За 3 дня</option>
          <option :value="7">За неделю</option>
          <option :value="14">За 2 недели</option>
          <option :value="30">За месяц</option>
        </UiSelect>
      </label>
      <UiInput v-model="form.note" label="Заметка" placeholder="Любимый цвет, интересы…" />
      <UiButton icon="＋" @click="createBirthday">Добавить</UiButton>
    </section>

    <section v-if="upcoming.length" class="upcoming-strip">
      <article v-for="birthday in upcoming" :key="birthday.id">
        <span>{{ initials(birthday.name) }}</span>
        <div>
          <strong>{{ birthday.name }}</strong>
          <small>{{ countdownLabel(birthday.daysUntil) }} · исполнится {{ birthday.turningAge }}</small>
        </div>
      </article>
    </section>

    <div class="birthday-grid">
      <article v-for="birthday in birthdays" :key="birthday.id" class="birthday-card">
        <header>
          <span class="birthday-card__avatar">{{ initials(birthday.name) }}</span>
          <div>
            <strong>{{ birthday.name }}</strong>
            <small>{{ formatBirthday(birthday.birthDate) }}</small>
          </div>
          <button type="button" @click="birthdayStore.removeBirthday(birthday.id)">×</button>
        </header>

        <div class="birthday-card__age">
          <article><strong>{{ birthday.age }}</strong><span>сейчас</span></article>
          <article><strong>{{ birthday.turningAge }}</strong><span>исполнится</span></article>
          <article><strong>{{ birthday.daysUntil }}</strong><span>дней осталось</span></article>
        </div>

        <p v-if="birthday.note">{{ birthday.note }}</p>

        <section class="gift-section">
          <header><strong>Идеи подарков</strong><small>{{ purchasedCount(birthday) }}/{{ birthday.giftIdeas.length }}</small></header>
          <div class="gift-list">
            <button
              v-for="gift in birthday.giftIdeas"
              :key="gift.id"
              type="button"
              :class="{ purchased: gift.purchased }"
              @click="birthdayStore.toggleGiftIdea(birthday.id, gift.id)"
            >
              <span>{{ gift.purchased ? '✓' : '' }}</span>
              <s v-if="gift.purchased">{{ gift.title }}</s>
              <b v-else>{{ gift.title }}</b>
              <i @click.stop="birthdayStore.removeGiftIdea(birthday.id, gift.id)">×</i>
            </button>
          </div>
          <div class="gift-add">
            <input
              v-model="giftInputs[birthday.id]"
              placeholder="Добавить идею…"
              @keydown.enter="addGift(birthday.id)"
            />
            <button type="button" @click="addGift(birthday.id)">＋</button>
          </div>
        </section>

        <footer>
          <span>↻ Каждый год в календаре</span>
          <button type="button" @click="openEdit(birthday)">Изменить</button>
        </footer>
      </article>

      <div v-if="!birthdays.length" class="birthdays-empty">
        <span>♡</span>
        <strong>Добавь первый день рождения</strong>
        <p>Он сразу появится в календаре и будет повторяться каждый год.</p>
      </div>
    </div>

    <UiModal v-model="isEditOpen" title="Изменить день рождения" eyebrow="Дни рождения" width="440px">
      <div class="birthday-edit">
        <UiInput v-model="editForm.name" label="Имя" />
        <UiInput v-model="editForm.birthDate" type="date" label="Дата рождения" />
        <label>
          <span>Напомнить заранее</span>
          <UiSelect v-model.number="editForm.reminderDays">
            <option :value="0">Только в календаре</option>
            <option :value="3">За 3 дня</option>
            <option :value="7">За неделю</option>
            <option :value="14">За 2 недели</option>
            <option :value="30">За месяц</option>
          </UiSelect>
        </label>
        <UiInput v-model="editForm.note" type="textarea" label="Заметка" />
        <footer>
          <UiButton variant="secondary" @click="isEditOpen = false">Отмена</UiButton>
          <UiButton @click="saveEdit">Сохранить</UiButton>
        </footer>
      </div>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiModal from '../../components/ui/UiModal.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import { birthdayStore } from '../../stores/birthday.store.js'
import { useNotification } from '../../composables/ui/useNotification.js'
import { DateHelper } from '../../utils/date/dateHelper.js'

const { notify } = useNotification()
const birthdays = birthdayStore.birthdays
const upcoming = birthdayStore.upcomingBirthdays
const nextBirthday = computed(() => birthdays.value[0] || null)
const form = reactive({
  name: '',
  birthDate: `${new Date().getFullYear() - 25}-01-01`,
  reminderDays: 7,
  note: '',
})
const giftInputs = reactive({})
const isEditOpen = ref(false)
const editingId = ref('')
const editForm = reactive({ name: '', birthDate: '', reminderDays: 7, note: '' })

async function createBirthday() {
  const result = await birthdayStore.addBirthday(form)
  if (!result.ok) return notify(result.message, 'warning')
  form.name = ''
  form.note = ''
  notify('День рождения добавлен в календарь', 'success')
}

function addGift(id) {
  if (birthdayStore.addGiftIdea(id, giftInputs[id])) giftInputs[id] = ''
}

function openEdit(birthday) {
  editingId.value = birthday.id
  Object.assign(editForm, {
    name: birthday.name,
    birthDate: birthday.birthDate,
    reminderDays: birthday.reminderDays,
    note: birthday.note,
  })
  isEditOpen.value = true
}

async function saveEdit() {
  const result = await birthdayStore.updateBirthday(editingId.value, editForm)
  notify(result.ok ? 'День рождения обновлён' : result.message, result.ok ? 'success' : 'warning')
  if (result.ok) isEditOpen.value = false
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function formatBirthday(value) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(DateHelper.parseKey(value))
}

function countdownLabel(days) {
  if (days === 0) return 'Сегодня!'
  if (days === 1) return 'Завтра'
  return `Через ${days} ${pluralize(days, ['день', 'дня', 'дней'])}`
}

function purchasedCount(birthday) {
  return birthday.giftIdeas.filter((gift) => gift.purchased).length
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
.birthdays-page{display:grid;gap:14px;padding:14px}.birthdays-hero{display:flex;justify-content:space-between;align-items:end;gap:18px;padding:20px}.birthdays-hero>div:first-child>span,.birthday-create label>span,.birthday-edit label>span{color:var(--text-muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.11em}.birthdays-hero h1{margin:3px 0 6px}.birthdays-hero p{max-width:650px;margin:0;color:var(--text-secondary)}.birthdays-hero__next{display:grid;min-width:180px;border:1px solid var(--border-color);border-radius:12px;padding:10px 12px;background:var(--card-soft)}.birthdays-hero__next small,.birthdays-hero__next span{color:var(--text-muted)}.birthdays-hero__next strong{font-size:17px}
.birthday-create{display:grid;grid-template-columns:1fr 170px 170px 1fr auto;align-items:end;gap:8px;padding:12px}.birthday-create label,.birthday-edit label{display:grid;gap:5px}.upcoming-strip{display:flex;gap:8px;overflow-x:auto}.upcoming-strip article{display:flex;align-items:center;gap:8px;min-width:220px;border:1px solid color-mix(in srgb,var(--pink) 25%,var(--border-color));border-radius:12px;padding:9px;background:color-mix(in srgb,var(--pink) 6%,var(--card-solid))}.upcoming-strip article>span,.birthday-card__avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;color:#fff;background:var(--pink);font-weight:900}.upcoming-strip strong,.upcoming-strip small{display:block}.upcoming-strip small{color:var(--text-muted)}
.birthday-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.birthday-card{display:grid;align-content:start;gap:11px;border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:12px;background:var(--card-solid)}.birthday-card>header{display:grid;grid-template-columns:42px minmax(0,1fr) 24px;align-items:center;gap:9px}.birthday-card__avatar{width:42px;height:42px}.birthday-card>header strong,.birthday-card>header small{display:block}.birthday-card>header small{color:var(--text-muted)}.birthday-card>header button{border:0;color:var(--danger);background:transparent;font-size:18px}.birthday-card__age{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.birthday-card__age article{display:grid;border:1px solid var(--border-color);border-radius:9px;padding:7px;background:var(--card-soft)}.birthday-card__age strong{font-size:18px}.birthday-card__age span{color:var(--text-muted);font-size:9px}.birthday-card>p{margin:0;color:var(--text-secondary)}
.gift-section{display:grid;gap:7px;padding-top:9px;border-top:1px solid var(--border-color)}.gift-section>header{display:flex;justify-content:space-between}.gift-section>header small{color:var(--text-muted)}.gift-list{display:grid;gap:4px}.gift-list button{display:grid;grid-template-columns:20px minmax(0,1fr) 20px;align-items:center;gap:6px;border:1px solid var(--border-color);border-radius:8px;padding:6px;color:var(--text-secondary);background:var(--control-bg);text-align:left}.gift-list button>span{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--border-color);border-radius:50%;color:var(--success)}.gift-list i{color:var(--danger);font-style:normal;text-align:center}.gift-list .purchased{opacity:.65}.gift-add{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:5px}.gift-add input{min-width:0;border:1px solid var(--border-color);border-radius:8px;padding:7px;color:var(--text-primary);background:var(--field-bg);outline:0}.gift-add button{border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);background:var(--control-bg)}.birthday-card>footer{display:flex;justify-content:space-between;align-items:center;margin-top:auto}.birthday-card>footer span{color:var(--success);font-size:9px}.birthday-card>footer button{border:0;color:var(--text-secondary);background:transparent;font-size:10px;font-weight:800}
.birthdays-empty{grid-column:1/-1;display:grid;place-items:center;gap:5px;min-height:230px;border:1px dashed var(--border-color);border-radius:var(--radius-xl);color:var(--text-muted);text-align:center}.birthdays-empty>span{font-size:28px;color:var(--pink)}.birthdays-empty p{margin:0}.birthday-edit{display:grid;gap:10px}.birthday-edit>footer{display:flex;justify-content:flex-end;gap:7px}
@media(max-width:1100px){.birthday-create{grid-template-columns:repeat(2,1fr)}.birthday-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.birthdays-page{padding:10px}.birthdays-hero,.birthday-create,.birthday-grid{grid-template-columns:1fr}.birthdays-hero{display:grid;padding:14px}.birthdays-hero__next{min-width:0}}
</style>
