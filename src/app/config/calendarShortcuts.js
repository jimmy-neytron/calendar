export const CALENDAR_SHORTCUT_GROUPS = [
  {
    title: 'События',
    items: [
      {
        keys: ['Перетащить'],
        description: 'Перенести событие на другой день или час',
      },
      {
        keys: ['Alt', 'Перетащить'],
        description: 'Создать копию события',
      },
      {
        keys: ['Клик / двойной клик'],
        description: 'Открыть событие для редактирования',
      },
      {
        keys: ['N'],
        description: 'Создать новое событие',
      },
    ],
  },
  {
    title: 'Навигация',
    items: [
      {
        keys: ['T'],
        description: 'Перейти к сегодняшней дате',
      },
      {
        keys: ['M'],
        description: 'Открыть режим месяца',
      },
      {
        keys: ['W'],
        description: 'Открыть режим недели',
      },
      {
        keys: ['D'],
        description: 'Открыть режим дня',
      },
    ],
  },
  {
    title: 'Команды',
    items: [
      {
        keys: ['/'],
        description: 'Открыть палитру команд',
      },
      {
        keys: ['Ctrl / ⌘', 'K'],
        description: 'Открыть палитру команд',
      },
    ],
  },
]
