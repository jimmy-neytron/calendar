export const VIEW_KEYS = {
  CALENDAR: 'calendar',
  SETTINGS: 'settings',
  SPORT: 'sport',
}

export const CALENDAR_MODES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
}

export const EVENT_CATEGORIES = [
  { value: 'all', label: 'Все категории', color: 'var(--text-secondary)' },
  { value: 'school', label: 'Школа', color: 'var(--info)' },
  { value: 'work', label: 'Работа', color: 'var(--accent)' },
  { value: 'sports', label: 'Спорт', color: 'var(--success)' },
  { value: 'health', label: 'Здоровье', color: 'var(--danger)' },
  { value: 'home', label: 'Дом', color: 'var(--warning)' },
  { value: 'birthday', label: 'День рождения', color: 'var(--pink)' },
  { value: 'personal', label: 'Личное', color: 'var(--orange)' },
  { value: 'other', label: 'Другое', color: 'var(--text-secondary)' },
]

export const EVENT_FORM_CATEGORIES = EVENT_CATEGORIES.filter((category) => category.value !== 'all')

export const REPEAT_OPTIONS = [
  { value: 'none', label: 'Не повторять' },
  { value: 'daily', label: 'Каждый день' },
  { value: 'workdays', label: 'По рабочим дням' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'biweekly', label: 'Через неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
  { value: 'monthly-nth-weekday', label: 'В этот по счёту день недели месяца' },
  { value: 'monthly-last-weekday', label: 'В последний такой день недели месяца' },
  { value: 'yearly', label: 'Каждый год' },
  { value: 'custom', label: 'Свой вариант' },
]

export const REPEAT_UNITS = [
  { value: 'day', label: 'день' },
  { value: 'week', label: 'неделю' },
  { value: 'month', label: 'месяц' },
]

export const REPEAT_END_OPTIONS = [
  { value: 'never', label: 'Никогда' },
  { value: 'until', label: 'До даты' },
  { value: 'count', label: 'После N повторений' },
]

export const WEEKDAY_OPTIONS = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 0, short: 'Вс', label: 'Воскресенье' },
]

export const IMPORTANCE_OPTIONS = [
  { value: 'normal', label: 'Обычное', icon: '' },
  { value: 'important', label: 'Важное', icon: '!' },
  { value: 'urgent', label: 'Срочное', icon: '!!' },
]

export const REMINDER_OPTIONS = [
  { value: 'none', label: 'Не напоминать', minutes: null },
  { value: '5m', label: 'За 5 минут', minutes: 5 },
  { value: '15m', label: 'За 15 минут', minutes: 15 },
  { value: '1h', label: 'За 1 час', minutes: 60 },
  { value: '1d', label: 'За 1 день', minutes: 1440 },
]

export const DUPLICATE_OPTIONS = [
  { value: 'tomorrow', label: 'На завтра' },
  { value: 'next-week', label: 'На следующую неделю' },
  { value: 'workdays', label: 'На рабочие дни недели' },
  { value: 'weekend', label: 'На выходные' },
  { value: 'custom-dates', label: 'На выбранные даты' },
]

export const EVENT_TEMPLATES = [
  {
    id: 'call',
    title: 'Созвон',
    category: 'work',
    duration: 30,
    importance: 'normal',
    reminder: '15m',
  },
  {
    id: 'training',
    title: 'Тренировка',
    category: 'sports',
    duration: 60,
    importance: 'normal',
    reminder: '1h',
    repeat: 'weekly',
  },
  {
    id: 'doctor',
    title: 'Врач',
    category: 'health',
    duration: 45,
    importance: 'important',
    reminder: '1d',
  },
  {
    id: 'work',
    title: 'Рабочий блок',
    category: 'work',
    duration: 120,
    importance: 'normal',
    reminder: 'none',
    repeat: 'workdays',
  },
]

export const DEFAULT_FILTERS = {
  search: '',
  calendarId: 'all',
  category: 'all',
  memberId: 'all',
  importance: 'all',
  onlyMine: false,
}

export const DEFAULT_PREFERENCES = {
  defaultMode: CALENDAR_MODES.MONTH,
  weekStartsOn: 1,
  density: 'compact',
  theme: 'black',
  hidePastEvents: false,
}


export const THEME_OPTIONS = [
  { value: 'black', label: 'Черная' },
  { value: 'light', label: 'Светлая' },
]

export const WEEK_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export const WEEK_DAYS_FROM_MONDAY = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WEEK_DAYS_LONG = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export const MEMBER_COLORS = ['#ffffff', '#a1a1a1', '#f472b6', '#60a5fa', '#22c55e', '#eab308', '#ef4444']

export const DAY_TIMELINE_HOURS = Array.from({ length: 18 }, (_, index) => index + 6)
