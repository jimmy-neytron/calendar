const DAY = 24 * 60 * 60 * 1000

const REWARD_CATALOG = [
  { id: 'activity-1', metric: 'totalDays', target: 1, title: 'Первый шаг', description: 'Отметь первый выполненный день в любом челлендже.', rarity: 'Обычная', tone: 'bronze', icon: 'star' },
  { id: 'activity-3', metric: 'totalDays', target: 3, title: 'Хорошее начало', description: 'Набери три выполненных дня во всех челленджах.', rarity: 'Обычная', tone: 'bronze', icon: 'fire' },
  { id: 'activity-7', metric: 'totalDays', target: 7, title: 'Первая семёрка', description: 'Собери семь отметок выполнения.', rarity: 'Обычная', tone: 'bronze', icon: 'star' },
  { id: 'activity-14', metric: 'totalDays', target: 14, title: 'Две недели побед', description: 'Набери четырнадцать выполненных дней.', rarity: 'Обычная', tone: 'bronze', icon: 'target' },
  { id: 'activity-30', metric: 'totalDays', target: 30, title: 'Месяц движения', description: 'Собери тридцать отметок во всех челленджах.', rarity: 'Редкая', tone: 'silver', icon: 'star' },
  { id: 'activity-50', metric: 'totalDays', target: 50, title: 'Полсотни', description: 'Пятьдесят выполненных дней уже в коллекции.', rarity: 'Редкая', tone: 'silver', icon: 'trophy' },
  { id: 'activity-75', metric: 'totalDays', target: 75, title: 'Крепкий ритм', description: 'Набери семьдесят пять отметок выполнения.', rarity: 'Редкая', tone: 'silver', icon: 'fire' },
  { id: 'activity-100', metric: 'totalDays', target: 100, title: 'Сотня побед', description: 'Достигни ста выполненных дней суммарно.', rarity: 'Эпическая', tone: 'gold', icon: 'trophy' },
  { id: 'activity-150', metric: 'totalDays', target: 150, title: 'Не остановить', description: 'Сто пятьдесят отметок — это настоящая дисциплина.', rarity: 'Эпическая', tone: 'gold', icon: 'fire' },
  { id: 'activity-200', metric: 'totalDays', target: 200, title: 'Двести сильных дней', description: 'Собери двести выполненных дней в любых челленджах.', rarity: 'Легендарная', tone: 'violet', icon: 'trophy' },
  { id: 'activity-300', metric: 'totalDays', target: 300, title: 'Мастер постоянства', description: 'Триста выполненных дней подтверждают твой характер.', rarity: 'Легендарная', tone: 'violet', icon: 'star' },
  { id: 'activity-500', metric: 'totalDays', target: 500, title: 'Живая легенда', description: 'Пятьсот отметок в общей истории челленджей.', rarity: 'Мифическая', tone: 'final', icon: 'trophy' },

  { id: 'streak-3', metric: 'maxStreak', target: 3, title: 'Искра серии', description: 'Продержись три дня подряд в одном челлендже.', rarity: 'Обычная', tone: 'bronze', icon: 'fire' },
  { id: 'streak-7', metric: 'maxStreak', target: 7, title: 'Неделя без пауз', description: 'Выполняй один челлендж семь дней подряд.', rarity: 'Обычная', tone: 'bronze', icon: 'fire' },
  { id: 'streak-14', metric: 'maxStreak', target: 14, title: 'Ритм закреплён', description: 'Сохрани серию четырнадцать дней подряд.', rarity: 'Редкая', tone: 'silver', icon: 'fire' },
  { id: 'streak-30', metric: 'maxStreak', target: 30, title: 'Несокрушимая серия', description: 'Не прерывай один челлендж целый месяц.', rarity: 'Эпическая', tone: 'gold', icon: 'fire' },
  { id: 'streak-60', metric: 'maxStreak', target: 60, title: 'Стальной режим', description: 'Сохрани непрерывную серию шестьдесят дней.', rarity: 'Легендарная', tone: 'violet', icon: 'fire' },
  { id: 'streak-100', metric: 'maxStreak', target: 100, title: 'Вечный огонь', description: 'Дойди до серии в сто дней без перерыва.', rarity: 'Мифическая', tone: 'final', icon: 'fire' },

  { id: 'started-1', metric: 'startedCount', target: 1, title: 'Инициатор', description: 'Начни свой первый челлендж.', rarity: 'Обычная', tone: 'bronze', icon: 'target' },
  { id: 'started-3', metric: 'startedCount', target: 3, title: 'Исследователь целей', description: 'Сделай хотя бы одну отметку в трёх челленджах.', rarity: 'Редкая', tone: 'silver', icon: 'target' },
  { id: 'started-5', metric: 'startedCount', target: 5, title: 'Коллекционер целей', description: 'Начни пять разных челленджей.', rarity: 'Эпическая', tone: 'gold', icon: 'star' },
  { id: 'started-10', metric: 'startedCount', target: 10, title: 'Безграничный рост', description: 'Начни десять разных челленджей.', rarity: 'Легендарная', tone: 'violet', icon: 'trophy' },

  { id: 'completed-1', metric: 'completedCount', target: 1, title: 'Финишер', description: 'Полностью заверши любой челлендж.', rarity: 'Редкая', tone: 'silver', icon: 'trophy' },
  { id: 'completed-3', metric: 'completedCount', target: 3, title: 'Тройной триумф', description: 'Заверши три любых челленджа.', rarity: 'Эпическая', tone: 'gold', icon: 'trophy' },
  { id: 'completed-5', metric: 'completedCount', target: 5, title: 'Покоритель вершин', description: 'Полностью заверши пять челленджей.', rarity: 'Мифическая', tone: 'final', icon: 'trophy' },

  { id: 'progress-25', metric: 'maxProgress', target: 25, title: 'Четверть пути', description: 'Пройди 25% любого челленджа.', rarity: 'Обычная', tone: 'bronze', icon: 'target' },
  { id: 'progress-50', metric: 'maxProgress', target: 50, title: 'Экватор', description: 'Доберись до половины любого челленджа.', rarity: 'Редкая', tone: 'silver', icon: 'target' },
  { id: 'progress-75', metric: 'maxProgress', target: 75, title: 'Финиш близко', description: 'Пройди 75% любого челленджа.', rarity: 'Эпическая', tone: 'gold', icon: 'target' },

  { id: 'parallel-2', metric: 'maxParallel', target: 2, title: 'Двойной удар', description: 'Выполни два разных челленджа за один день.', rarity: 'Редкая', tone: 'silver', icon: 'star' },
  { id: 'parallel-3', metric: 'maxParallel', target: 3, title: 'Идеальный день', description: 'Выполни три разных челленджа за один день.', rarity: 'Легендарная', tone: 'violet', icon: 'trophy' },
]

const METRIC_META = {
  totalDays: { category: 'Общая активность', requirement: (target) => `${target} дн.`, remaining: (value) => `Ещё ${value} дн.` },
  maxStreak: { category: 'Серии', requirement: (target) => `${target} подряд`, remaining: (value) => `До серии ещё ${value} дн.` },
  startedCount: { category: 'Новые цели', requirement: (target) => `${target} чел.`, remaining: (value) => `Начать ещё ${value}` },
  completedCount: { category: 'Завершения', requirement: (target) => `${target} финиш`, remaining: (value) => `Завершить ещё ${value}` },
  maxProgress: { category: 'Прогресс', requirement: (target) => `${target}%`, remaining: (value) => `До цели ещё ${value}%` },
  maxParallel: { category: 'Мультичеллендж', requirement: (target) => `${target} за день`, remaining: (value) => `Выполнить ещё ${value} за день` },
}

function getLongestStreak(completedDates = []) {
  const dates = [...new Set(completedDates)].sort()
  let longest = 0
  let current = 0
  let previous = null

  dates.forEach((date) => {
    const timestamp = Date.parse(`${date}T00:00:00Z`)
    current = previous !== null && timestamp - previous === DAY ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = timestamp
  })

  return longest
}

function calculateRewardStats(challenges = []) {
  const completionDates = new Map()
  let totalDays = 0
  let maxStreak = 0
  let startedCount = 0
  let completedCount = 0
  let maxProgress = 0

  challenges.forEach((challenge) => {
    const dates = [...new Set(challenge.completedDates || [])]
    const targetDays = Math.max(1, Number(challenge.targetDays) || 1)

    totalDays += dates.length
    if (dates.length) startedCount += 1
    if (dates.length >= targetDays) completedCount += 1
    maxStreak = Math.max(maxStreak, getLongestStreak(dates))
    maxProgress = Math.max(maxProgress, Math.min(100, Math.round(dates.length / targetDays * 100)))

    dates.forEach((date) => completionDates.set(date, (completionDates.get(date) || 0) + 1))
  })

  return {
    totalDays,
    maxStreak,
    startedCount,
    completedCount,
    maxProgress,
    maxParallel: Math.max(0, ...completionDates.values()),
  }
}

export function buildRewardsCollection(challenges = []) {
  const stats = calculateRewardStats(challenges)

  return REWARD_CATALOG.map((reward) => {
    const current = stats[reward.metric]
    const remaining = Math.max(0, reward.target - current)
    const meta = METRIC_META[reward.metric]

    return {
      ...reward,
      category: meta.category,
      requirement: meta.requirement(reward.target),
      current,
      remaining,
      remainingLabel: meta.remaining(remaining),
      unlocked: current >= reward.target,
      progress: Math.min(100, Math.round(current / reward.target * 100)),
    }
  })
}
