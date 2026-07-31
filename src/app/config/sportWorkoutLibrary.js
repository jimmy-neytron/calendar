const exercise = (title, sets, reps, muscleGroups, instructions, extra = {}) => ({
  title, sets, reps, muscleGroups, instructions, ...extra,
})

export const SPORT_WORKOUT_LIBRARY = [
  {
    id: 'push-power', title: 'Грудь и плечи', subtitle: 'Жимовая силовая тренировка',
    focus: ['грудь', 'плечи', 'трицепс'], difficulty: 'Средняя', equipment: 'Без оборудования', color: '#ff7a59', duration: 32,
    exercises: [
      exercise('Отжимания', '4 подхода', '8–15 повторений', ['грудь', 'трицепс'], 'Корпус держи одной линией, локти направляй назад под углом.', { durationMinutes: 9, restSeconds: 60, easierVariant: 'Отжимания от высокой опоры.', harderVariant: 'Медленное опускание за 3 секунды.' }),
      exercise('Отжимания уголком', '3 подхода', '6–10 повторений', ['плечи', 'трицепс'], 'Подними таз, направляй макушку к полу между ладонями.', { durationMinutes: 7, restSeconds: 60 }),
      exercise('Узкие отжимания', '3 подхода', '6–12 повторений', ['трицепс', 'грудь'], 'Держи локти ближе к корпусу и не проваливай поясницу.', { durationMinutes: 7, restSeconds: 50 }),
      exercise('Планка с касанием плеч', '3 подхода', '10 на сторону', ['плечи', 'кор'], 'Не раскачивая таз, поочерёдно касайся ладонью противоположного плеча.', { durationMinutes: 7, restSeconds: 40 }),
    ],
  },
  {
    id: 'legs-glutes', title: 'Ноги и ягодицы', subtitle: 'Сила и устойчивость нижней части тела',
    focus: ['ноги', 'ягодицы'], difficulty: 'Средняя', equipment: 'Без оборудования', color: '#a78bfa', duration: 38,
    exercises: [
      exercise('Приседания', '4 подхода', '12–15 повторений', ['ноги', 'ягодицы'], 'Отводи таз назад, колени направляй по линии носков.', { durationMinutes: 9, restSeconds: 60 }),
      exercise('Обратные выпады', '3 подхода', '10 на сторону', ['ноги', 'ягодицы'], 'Шагай назад и сохраняй устойчивое положение корпуса.', { durationMinutes: 9, restSeconds: 60 }),
      exercise('Ягодичный мост', '4 подхода', '15 повторений', ['ягодицы', 'задняя поверхность бедра'], 'Подкрути таз и сожми ягодицы в верхней точке.', { durationMinutes: 8, restSeconds: 45 }),
      exercise('Подъёмы на носки', '3 подхода', '18–25 повторений', ['икры'], 'Поднимайся максимально высоко и опускай пятки подконтрольно.', { durationMinutes: 6, restSeconds: 35 }),
    ],
  },
  {
    id: 'back-posture', title: 'Спина и осанка', subtitle: 'Тяговые движения и контроль лопаток',
    focus: ['спина', 'бицепс', 'осанка'], difficulty: 'Средняя', equipment: 'Резинка или полотенце', color: '#38bdf8', duration: 34,
    exercises: [
      exercise('Тяга резинки к поясу', '4 подхода', '12–15 повторений', ['спина', 'бицепс'], 'Начинай движение со сведения лопаток, плечи не поднимай.', { durationMinutes: 9, restSeconds: 55, easierVariant: 'Используй более лёгкую резинку.' }),
      exercise('Разведение рук с резинкой', '3 подхода', '12–15 повторений', ['верх спины', 'задняя дельта'], 'Держи рёбра собранными и разводи руки за счёт лопаток.', { durationMinutes: 7, restSeconds: 45 }),
      exercise('Лодочка с тягой локтей', '3 подхода', '10–12 повторений', ['разгибатели спины', 'верх спины'], 'Слегка приподними грудь и тяни локти к тазу без резкого прогиба.', { durationMinutes: 8, restSeconds: 50 }),
      exercise('Скольжение руками у стены', '3 подхода', '10 повторений', ['осанка', 'плечи'], 'Прижимай затылок и спину к стене, двигай руками без боли.', { durationMinutes: 7, restSeconds: 35 }),
    ],
  },
  {
    id: 'core-stability', title: 'Сильный кор', subtitle: 'Пресс, стабилизация и контроль таза',
    focus: ['кор', 'пресс'], difficulty: 'Средняя', equipment: 'Коврик', color: '#34d399', duration: 28,
    exercises: [
      exercise('Dead bug', '3 подхода', '8–10 на сторону', ['кор', 'пресс'], 'Прижми поясницу к полу и медленно опускай противоположные руку и ногу.', { durationMinutes: 7, restSeconds: 40, commonMistakes: 'Прогиб в пояснице и спешка.' }),
      exercise('Боковая планка', '3 подхода', '20–30 секунд на сторону', ['косые мышцы', 'кор'], 'Поставь локоть под плечо и выстрой тело в одну линию.', { durationMinutes: 7, restSeconds: 45, easierVariant: 'Опора на нижнее колено.' }),
      exercise('Обратные скручивания', '3 подхода', '10–12 повторений', ['пресс'], 'Подкручивай таз на выдохе без маха ногами.', { durationMinutes: 7, restSeconds: 45 }),
      exercise('Bird dog', '3 подхода', '8 на сторону', ['кор', 'спина'], 'Вытягивай противоположные руку и ногу, не разворачивая таз.', { durationMinutes: 7, restSeconds: 35 }),
    ],
  },
  {
    id: 'full-body', title: 'Всё тело', subtitle: 'Быстрая функциональная тренировка',
    focus: ['всё тело', 'кардио'], difficulty: 'Средняя', equipment: 'Без оборудования', color: '#f59e0b', duration: 30,
    exercises: [
      exercise('Присед + подъём колена', '3 подхода', '12 повторений', ['ноги', 'кор'], 'После приседа подними колено к груди, сохраняя баланс.', { durationMinutes: 7, restSeconds: 40 }),
      exercise('Отжимания', '3 подхода', '8–12 повторений', ['грудь', 'трицепс'], 'Держи корпус ровно и опускай грудь между ладонями.', { durationMinutes: 7, restSeconds: 50 }),
      exercise('Медленный альпинист', '3 подхода', '12 на сторону', ['кор', 'плечи'], 'Подтягивай колено к груди без раскачивания таза.', { durationMinutes: 7, restSeconds: 40 }),
      exercise('Good morning', '3 подхода', '15 повторений', ['задняя поверхность бедра', 'спина'], 'Отводи таз назад с нейтральной спиной и мягкими коленями.', { durationMinutes: 7, restSeconds: 40 }),
    ],
  },
  {
    id: 'mobility-reset', title: 'Мобильность', subtitle: 'Восстановление суставов и спины',
    focus: ['мобильность', 'восстановление'], difficulty: 'Лёгкая', equipment: 'Коврик', color: '#2dd4bf', duration: 22,
    exercises: [
      exercise('Кошка-корова', '2 подхода', '8 циклов', ['спина', 'мобильность'], 'Плавно двигай позвоночником в ритме дыхания.', { durationMinutes: 5, restSeconds: 15 }),
      exercise('Повороты грудного отдела', '2 подхода', '8 на сторону', ['верх спины', 'мобильность'], 'Из положения на четвереньках разворачивай грудную клетку за рукой.', { durationMinutes: 5, restSeconds: 20 }),
      exercise('90/90 для таза', '2 подхода', '8 переходов', ['таз', 'ягодицы'], 'Перекладывай колени из стороны в сторону без рывков.', { durationMinutes: 6, restSeconds: 20 }),
      exercise('Растяжка сгибателей бедра', '2 подхода', '30 секунд на сторону', ['таз', 'ноги'], 'Подкрути таз и мягко перенеси вес вперёд.', { durationMinutes: 5, restSeconds: 15 }),
    ],
  },
  {
    id: 'low-impact-cardio', title: 'Кардио без прыжков', subtitle: 'Пульс и выносливость без ударной нагрузки',
    focus: ['кардио', 'выносливость'], difficulty: 'Лёгкая', equipment: 'Без оборудования', color: '#fb7185', duration: 25,
    exercises: [
      exercise('Шаг с высоким коленом', '4 раунда', '40 секунд', ['кардио', 'ноги'], 'Работай руками и держи ровный ритм дыхания.', { durationMinutes: 6, restSeconds: 20 }),
      exercise('Боксирование в стойке', '4 раунда', '40 секунд', ['кардио', 'плечи'], 'Поворачивай корпус вместе с ударами и не выпрямляй локти до конца.', { durationMinutes: 6, restSeconds: 20 }),
      exercise('Шаги конькобежца', '4 раунда', '40 секунд', ['ноги', 'ягодицы'], 'Шагай в сторону широко, но без прыжка.', { durationMinutes: 6, restSeconds: 20 }),
      exercise('Альпинист от опоры', '4 раунда', '40 секунд', ['кардио', 'кор'], 'Упрись руками в устойчивую опору и меняй ноги в комфортном темпе.', { durationMinutes: 6, restSeconds: 20 }),
    ],
  },
  {
    id: 'arms-quick', title: 'Руки за 20 минут', subtitle: 'Бицепс, трицепс и плечи',
    focus: ['руки', 'плечи'], difficulty: 'Лёгкая', equipment: 'Гантели или бутылки', color: '#c084fc', duration: 20,
    exercises: [
      exercise('Сгибания на бицепс', '3 подхода', '12–15 повторений', ['бицепс'], 'Локти держи у корпуса, не раскачивайся.', { durationMinutes: 5, restSeconds: 40 }),
      exercise('Жим над головой', '3 подхода', '10–12 повторений', ['плечи', 'трицепс'], 'Не прогибай поясницу и веди вес вверх подконтрольно.', { durationMinutes: 5, restSeconds: 45 }),
      exercise('Разгибание рук из-за головы', '3 подхода', '12 повторений', ['трицепс'], 'Локти направляй вперёд и держи корпус собранным.', { durationMinutes: 5, restSeconds: 40 }),
      exercise('Подъёмы рук в стороны', '3 подхода', '12–15 повторений', ['плечи'], 'Поднимай руки до линии плеч без рывка.', { durationMinutes: 5, restSeconds: 35 }),
    ],
  },
]

export const BALANCED_WEEK_SCHEDULE = [
  { weekday: 1, workoutId: 'push-power' },
  { weekday: 2, workoutId: 'legs-glutes' },
  { weekday: 3, workoutId: 'mobility-reset' },
  { weekday: 4, workoutId: 'back-posture' },
  { weekday: 5, workoutId: 'core-stability' },
  { weekday: 6, workoutId: 'low-impact-cardio' },
]

export const MUSCLE_BALANCE_GROUPS = ['грудь', 'спина', 'плечи', 'руки', 'ноги', 'ягодицы', 'кор', 'мобильность']

export function buildBalancedWeek() {
  return BALANCED_WEEK_SCHEDULE.flatMap(({ weekday, workoutId }) => {
    const workout = SPORT_WORKOUT_LIBRARY.find((item) => item.id === workoutId)
    if (!workout) return []
    const instanceId = `balanced-${weekday}-${workout.id}`
    return workout.exercises.map((item, index) => ({
      ...item, weekday, workoutId: instanceId, workoutName: workout.title,
      workoutFocus: workout.focus, workoutColor: workout.color, order: weekday * 100 + index,
    }))
  })
}
