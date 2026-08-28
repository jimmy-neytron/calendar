export interface SidebarSection {
  name: string
  label: string
  description: string
  icon: string
  feature?: string
  extra?: boolean
  fixed?: boolean
}

export interface SidebarGroup {
  label: string
  items: SidebarSection[]
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Главное',
    items: [
      { name: 'calendar', label: 'Календарь', description: 'Общие планы и расписание', icon: 'calendar' },
      { name: 'birthdays', label: 'Дни рождения', description: 'Подарки и напоминания', icon: 'heart' },
      { name: 'ideas', label: 'Идеи', description: 'Копилка семейных планов', icon: 'sparkles' },
      { name: 'notes', label: 'Заметки', description: 'Быстрые записи и мысли', icon: 'notes' },
      { name: 'knowledge', label: 'Знания', description: 'Учёба, работа и связи', icon: 'book' },
      { name: 'challenges', label: 'Цели', description: 'Прогресс и личные рекорды', icon: 'trophy' },
    ],
  },
  {
    label: 'Семья и быт',
    items: [
      { name: 'budget', label: 'Бюджет', description: 'Доходы и семейные расходы', icon: 'wallet' },
      { name: 'meals', label: 'Питание', description: 'Меню, блюда и продукты', icon: 'utensils' },
      { name: 'purchases', label: 'Покупки', description: 'Нужное, желания и техника', icon: 'shopping', feature: 'purchases', extra: true },
      { name: 'coupons', label: 'Купоны', description: 'Скидки, QR и промокоды', icon: 'ticket' },
      { name: 'wardrobe', label: 'Шкаф', description: 'Вещи и готовые образы', icon: 'hanger', feature: 'extraSections', extra: true },
      { name: 'family-tree', label: 'Семейное дерево', description: 'Люди, поколения и связи', icon: 'users', feature: 'extraSections', extra: true },
    ],
  },
  {
    label: 'Личное',
    items: [
      { name: 'investments', label: 'Инвестиции', description: 'Активы, источники и курсы', icon: 'chart' },
      { name: 'sport', label: 'Спорт', description: 'Программа и прогресс', icon: 'sport', feature: 'sport', extra: true },
      { name: 'time-tracking', label: 'Учёт времени', description: 'Проекты и часы', icon: 'clock', feature: 'timeTracking', extra: true },
      { name: 'movies', label: 'Фильмы', description: 'Найти и посмотреть вместе', icon: 'movie', feature: 'movies', extra: true },
      { name: 'personal-parameters', label: 'Мои параметры', description: 'Размеры и характеристики', icon: 'ruler', feature: 'extraSections', extra: true },
    ],
  },
  {
    label: 'Управление',
    items: [
      { name: 'workspace', label: 'Семья', description: 'Участники и доступ', icon: 'users', feature: 'workspace' },
      { name: 'analytics', label: 'Аналитика', description: 'Ритм семейной жизни', icon: 'chart', feature: 'analytics' },
      { name: 'activity', label: 'Активность', description: 'История изменений', icon: 'activity', feature: 'activity' },
      { name: 'integrations', label: 'Интеграции', description: 'Telegram и внешние сервисы', icon: 'link', feature: 'integrations' },
      { name: 'admin-overview', label: 'Админка', description: 'Пользователи и заявки', icon: 'key' },
      { name: 'settings', label: 'Настройки', description: 'Профиль и приложение', icon: 'settings', fixed: true },
    ],
  },
]

export const SIDEBAR_SECTION_IDS = SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => item.name))
export const DEFAULT_MOBILE_SECTION_IDS = ['calendar', 'notes', 'budget', 'sport']

export const SIDEBAR_SECTIONS_BY_ID = new Map(
  SIDEBAR_GROUPS.flatMap((group) => group.items.map((item) => [item.name, item])),
)
