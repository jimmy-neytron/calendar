import { computed, watch } from 'vue'
import { calendarStore } from '../../../stores/calendar.store.js'
import { birthdayStore } from '../../../stores/birthday.store.js'
import { budgetStore } from '../../../stores/budget.store.js'
import { challengeStore } from '../../../stores/challenge.store.js'
import { sportStore } from '../../../stores/sport.store.js'
import { timeTrackingStore } from '../../../stores/timeTracking.store'
import { couponStore } from '../../../stores/coupon.store'
import { workspaceStore } from '../../../stores/workspace.store.js'
import { mealPlanStore } from '../../meals/stores/mealPlan.store'
import { getCouponDaysLeft, getCouponStatus } from '../../coupons/utils/couponExpiry'
import { useAvailableSections } from '../../../composables/navigation/useAvailableSections'
import { DateHelper } from '../../../utils/date/dateHelper.js'
import { formatRubles } from '../../../utils/formatters/currencyFormatter.js'

export interface TodayCardItem {
  id: string
  label: string
  meta?: string
  done?: boolean
}

export interface TodaySection {
  id: string
  title: string
  description: string
  icon: string
  routeName: string
  countLabel: string
  emptyLabel: string
  items: TodayCardItem[]
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

export function useTodaySections() {
  const { isSectionAvailable } = useAvailableSections()
  const todayKey = DateHelper.toKey(new Date())
  const weekEndKey = DateHelper.toKey(DateHelper.addDays(new Date(), 7))
  const todayTitle = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  watch(
    [workspaceStore.activeWorkspaceId, () => isSectionAvailable('meals')],
    ([workspaceId, mealsAvailable]) => {
      if (workspaceId && mealsAvailable) void mealPlanStore.load(getMondayKey(new Date()))
    },
    { immediate: true },
  )

  const sections = computed<TodaySection[]>(() => {
    const result: TodaySection[] = [calendarSection(todayKey), birthdaySection()]
    if (isSectionAvailable('budget')) result.push(budgetSection(todayKey, weekEndKey))
    result.push(challengeSection(todayKey))
    if (isSectionAvailable('meals')) result.push(mealsSection(todayKey))
    if (isSectionAvailable('sport')) result.push(sportSection())
    if (isSectionAvailable('time-tracking')) result.push(timeSection())
    if (isSectionAvailable('coupons')) result.push(couponSection())
    return result
  })

  const totalHighlights = computed(() => sections.value.reduce((total, section) => total + section.items.length, 0))
  return { sections, todayTitle, totalHighlights }
}

function calendarSection(todayKey: string): TodaySection {
  const items = calendarStore.todayEvents.value.slice(0, 5).map((event) => ({
    id: event.id,
    label: event.title,
    meta: event.allDay ? 'Весь день' : [event.startTime, event.location].filter(Boolean).join(' · '),
    done: Boolean(event.completedAt),
  }))
  return makeSection('calendar', 'Расписание', 'События на сегодня', 'calendar', 'calendar', items, 'На сегодня событий нет')
}

function birthdaySection(): TodaySection {
  const items = birthdayStore.birthdays.value.filter((item) => item.daysUntil <= 7).slice(0, 4).map((item) => ({
    id: item.id,
    label: item.name,
    meta: item.daysUntil === 0 ? 'Сегодня день рождения' : `Через ${item.daysUntil} дн.`,
  }))
  return makeSection('birthdays', 'Дни рождения', 'Ближайшие семь дней', 'heart', 'birthdays', items, 'В ближайшую неделю дней рождения нет')
}

function budgetSection(todayKey: string, weekEndKey: string): TodaySection {
  const items = budgetStore.payments.value
    .filter((item) => item.status === 'planned' && item.dueDate >= todayKey && item.dueDate <= weekEndKey)
    .slice(0, 4)
    .map((item) => ({ id: item.id, label: item.title, meta: `${formatRubles(item.plannedAmount)} · ${formatRelativeDate(item.dueDate, todayKey)}` }))
  return makeSection('budget', 'Платежи', 'Сроки на ближайшую неделю', 'wallet', 'budget', items, 'Ближайших платежей нет')
}

function challengeSection(todayKey: string): TodaySection {
  const items = challengeStore.challenges.value.filter((item) => item.active).slice(0, 4).map((item) => ({
    id: item.id,
    label: item.title,
    meta: (item.completedDates || []).includes(todayKey) ? 'Сегодня выполнено' : 'Ждёт отметки сегодня',
    done: (item.completedDates || []).includes(todayKey),
  }))
  return makeSection('challenges', 'Цели', 'Личный прогресс', 'trophy', 'challenges', items, 'Активных целей пока нет')
}

function mealsSection(todayKey: string): TodaySection {
  const dayPlan = mealPlanStore.week.value?.plan[todayKey] || {}
  const items = Object.entries(dayPlan).flatMap(([mealType, slot]) => {
    if (!slot) return []
    const recipe = mealPlanStore.recipeById.value.get(slot.recipeId)
    return [{ id: `${mealType}-${slot.recipeId}`, label: recipe?.title || 'Блюдо', meta: `${MEAL_LABELS[mealType] || mealType} · ${slot.servings} порц.` }]
  })
  return makeSection('meals', 'Питание', 'Меню на сегодня', 'utensils', 'meals', items, 'Меню на сегодня не запланировано')
}

function sportSection(): TodaySection {
  const items = sportStore.todayExercises.value.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.title,
    meta: [item.sets, item.reps].filter(Boolean).join(' · '),
    done: sportStore.isExerciseDone(item.id, sportStore.todayKey.value),
  }))
  return makeSection('sport', 'Тренировка', 'Программа на сегодня', 'sport', 'sport', items, 'Сегодня день восстановления')
}

function timeSection(): TodaySection {
  const minutes = timeTrackingStore.todayMinutes.value
  const items = minutes ? [{ id: 'today-time', label: formatDuration(minutes), meta: 'Зафиксировано сегодня', done: true }] : []
  return makeSection('time-tracking', 'Учёт времени', 'Фокус за день', 'clock', 'time-tracking', items, 'Сегодня время ещё не отмечалось')
}

function couponSection(): TodaySection {
  const items = couponStore.items.value
    .filter((item) => getCouponStatus(item) === 'expiring')
    .slice(0, 4)
    .map((item) => ({ id: item.id, label: item.title, meta: `${item.merchant || 'Купон'} · осталось ${getCouponDaysLeft(item.expiresOn)} дн.` }))
  return makeSection('coupons', 'Купоны', 'Скоро закончатся', 'ticket', 'coupons', items, 'Срочно использовать ничего не нужно')
}

function makeSection(id: string, title: string, description: string, icon: string, routeName: string, items: TodayCardItem[], emptyLabel: string): TodaySection {
  return { id, title, description, icon, routeName, items, emptyLabel, countLabel: items.length ? String(items.length) : '' }
}

function getMondayKey(date: Date) {
  const day = date.getDay() || 7
  return DateHelper.toKey(DateHelper.addDays(date, 1 - day))
}

function formatRelativeDate(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) return 'сегодня'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(DateHelper.parseKey(dateKey)).replace('.', '')
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин.`
  return rest ? `${hours} ч ${rest} мин.` : `${hours} ч`
}
