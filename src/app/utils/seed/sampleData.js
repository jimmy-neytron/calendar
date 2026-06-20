import { toDateKey, addDays } from '../formatters/dateFormatter.js'

const today = new Date()
const todayKey = toDateKey(today)
const tomorrowKey = toDateKey(addDays(today, 1))
const nextWeekKey = toDateKey(addDays(today, 6))

export const defaultMembers = [
  { id: 'm-parent-1', name: 'Аня', color: '#7c6cf0', avatar: 'А' },
  { id: 'm-parent-2', name: 'Илья', color: '#48dbfb', avatar: 'И' },
  { id: 'm-child-1', name: 'Мия', color: '#ff9ff3', avatar: 'М' },
  { id: 'm-child-2', name: 'Лев', color: '#1dd1a1', avatar: 'Л' },
]

export const defaultEvents = [
  {
    id: 'ev-school-dropoff',
    title: 'Отвести детей в школу',
    date: todayKey,
    startTime: '08:20',
    endTime: '08:45',
    memberIds: ['u-miya'],
    category: 'school',
    location: 'Главный вход',
    notes: 'Не забыть проект по окружающему миру.',
    allDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ev-dentist',
    title: 'Стоматолог',
    date: todayKey,
    startTime: '16:00',
    endTime: '16:45',
    memberIds: ['u-miya'],
    category: 'health',
    location: 'Детская клиника',
    notes: '',
    allDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ev-soccer',
    title: 'Тренировка по футболу',
    date: tomorrowKey,
    startTime: '18:30',
    endTime: '19:30',
    memberIds: ['u-ilya'],
    category: 'sports',
    location: 'Поле №3',
    notes: 'Взять бутылку воды.',
    allDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ev-family-night',
    title: 'Семейный вечер кино',
    date: nextWeekKey,
    startTime: '20:00',
    endTime: '22:00',
    memberIds: [],
    category: 'home',
    location: 'Гостиная',
    notes: 'Выбрать снеки из списка покупок.',
    allDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const defaultChores = [
  { id: 'ch-trash', title: 'Вынести мусор', memberId: 'm-child-2', repeat: 'Каждый день', points: 5, completed: false },
  { id: 'ch-table', title: 'Накрыть на ужин', memberId: 'm-child-1', repeat: 'Каждый день', points: 4, completed: false },
  { id: 'ch-laundry', title: 'Разложить бельё', memberId: 'm-parent-2', repeat: 'Вт / Чт', points: 6, completed: true },
  { id: 'ch-plants', title: 'Полить растения', memberId: 'm-parent-1', repeat: 'Раз в неделю', points: 3, completed: false },
]

export const defaultMeals = [
  { day: 0, name: 'Паста с овощами', notes: 'Добавить шпинат' },
  { day: 1, name: 'Курица с рисом', notes: 'Подготовить рис заранее' },
  { day: 2, name: 'Тако-вечер', notes: 'Купить авокадо' },
  { day: 3, name: 'Суп и тосты с сыром', notes: '' },
  { day: 4, name: 'Лосось с картофелем', notes: '' },
  { day: 5, name: 'Пицца-пятница', notes: 'Дети выбирают начинку' },
  { day: 6, name: 'Остатки недели', notes: '' },
]

export const defaultLists = [
  {
    id: 'list-grocery',
    title: 'Покупки',
    icon: '🛒',
    items: [
      { id: 'li-milk', text: 'Молоко', checked: false },
      { id: 'li-eggs', text: 'Яйца', checked: true },
      { id: 'li-avocado', text: 'Авокадо', checked: false },
    ],
  },
  {
    id: 'list-reminders',
    title: 'Семейные напоминания',
    icon: '📌',
    items: [
      { id: 'li-library', text: 'Вернуть книги в библиотеку', checked: false },
      { id: 'li-batteries', text: 'Купить батарейки AA', checked: false },
    ],
  },
]
