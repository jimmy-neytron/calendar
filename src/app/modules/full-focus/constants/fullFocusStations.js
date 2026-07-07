export const FULL_FOCUS_CATEGORIES = [
  {
    id: 'drive',
    label: 'Драйв',
    description: 'Хип-хоп и биты для тренировки или энергичной работы',
    accent: '#22c55e',
  },
  {
    id: 'deep-focus',
    label: 'Глубокий фокус',
    description: 'Lo-Fi Hip-Hop, чтобы спокойно держать концентрацию',
    accent: '#38bdf8',
  },
  {
    id: 'calm',
    label: 'Спокойствие',
    description: 'Мягкий lo-fi фон без резких скачков',
    accent: '#a78bfa',
  },
  {
    id: 'energy',
    label: 'Топ-хиты',
    description: 'Поп, чарты и радио с более привычными хитами',
    accent: '#fb7185',
  },
  {
    id: 'chill',
    label: 'Восстановление',
    description: 'Chill-радио после спорта или для вечернего режима',
    accent: '#14b8a6',
  },
]

export const FULL_FOCUS_STATIONS = [
  {
    id: 'record-yo',
    title: 'Record Yo! FM',
    subtitle: 'Rap, R&B, Hip-Hop',
    category: 'drive',
    streamUrl: 'https://radiorecord.hostingradio.ru/yo96.aacp',
    source: 'radiorecord.ru',
  },
  {
    id: 'hiphop-laut',
    title: 'HipHop Radio',
    subtitle: 'Urban mix',
    category: 'drive',
    streamUrl: 'https://stream.laut.fm/hiphop',
    source: 'laut.fm',
  },
  {
    id: '181-the-beat',
    title: '181.FM The Beat',
    subtitle: 'US hip-hop and R&B',
    category: 'drive',
    streamUrl: 'https://listen.181fm.com/181-thebeat_128k.mp3',
    source: '181.fm',
  },
  {
    id: 'record-lofi',
    title: 'Record Lo-Fi',
    subtitle: 'Lo-Fi Hip-Hop',
    category: 'deep-focus',
    streamUrl: 'https://radiorecord.hostingradio.ru/lofi96.aacp',
    source: 'radiorecord.ru',
  },
  {
    id: 'lofi-laut',
    title: 'LoFi Radio',
    subtitle: 'Lo-Fi beats',
    category: 'deep-focus',
    streamUrl: 'https://stream.laut.fm/lofi',
    source: 'laut.fm',
  },
  {
    id: 'beat-blender',
    title: 'Beat Blender',
    subtitle: 'Downtempo beats',
    category: 'deep-focus',
    streamUrl: 'https://ice2.somafm.com/beatblender-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'lush',
    title: 'Lush',
    subtitle: 'Soft lo-fi mood',
    category: 'calm',
    streamUrl: 'https://ice2.somafm.com/lush-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'secret-agent',
    title: 'Secret Agent',
    subtitle: 'Soft cinematic lounge',
    category: 'calm',
    streamUrl: 'https://ice2.somafm.com/secretagent-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'indie-pop-rocks',
    title: 'Indie Pop Rocks',
    subtitle: 'Light indie energy',
    category: 'energy',
    streamUrl: 'https://ice2.somafm.com/indiepop-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'poptron',
    title: 'PopTron',
    subtitle: 'Indie pop radio',
    category: 'energy',
    streamUrl: 'https://ice2.somafm.com/poptron-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'record-pop',
    title: 'Record Pop',
    subtitle: 'Pop hits',
    category: 'energy',
    streamUrl: 'https://radiorecord.hostingradio.ru/pop96.aacp',
    source: 'radiorecord.ru',
  },
  {
    id: '181-power',
    title: '181.FM Power 181',
    subtitle: 'US Top 40 hits',
    category: 'energy',
    streamUrl: 'https://listen.181fm.com/181-power_128k.mp3',
    source: '181.fm',
  },
  {
    id: 'top100station',
    title: 'Top 100 Station',
    subtitle: 'Charts and pop hits',
    category: 'energy',
    streamUrl: 'https://stream.laut.fm/top100station',
    source: 'laut.fm',
  },
  {
    id: 'big-r-top40',
    title: 'Big R Radio Top 40',
    subtitle: 'Pop chart hits',
    category: 'energy',
    streamUrl: 'https://bigrradio.cdnstream1.com/5106_128',
    source: 'Big R Radio',
  },
  {
    id: 'laut-top40',
    title: 'Top 40',
    subtitle: 'Pop and current hits',
    category: 'energy',
    streamUrl: 'https://stream.laut.fm/top40',
    source: 'laut.fm',
  },
  {
    id: 'chartmix',
    title: 'ChartMix',
    subtitle: 'Charts, pop, hits',
    category: 'energy',
    streamUrl: 'https://stream.laut.fm/chartmix',
    source: 'laut.fm',
  },
  {
    id: '1000hits',
    title: '1000 Hits',
    subtitle: 'Popular hits mix',
    category: 'energy',
    streamUrl: 'https://stream.laut.fm/1000hits',
    source: 'laut.fm',
  },
  {
    id: 'groove-salad',
    title: 'Groove Salad',
    subtitle: 'Chill radio',
    category: 'chill',
    streamUrl: 'https://ice2.somafm.com/groovesalad-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'drone-zone',
    title: 'Drone Zone',
    subtitle: 'Deep ambient recovery',
    category: 'chill',
    streamUrl: 'https://ice2.somafm.com/dronezone-128-mp3',
    source: 'somafm.com',
  },
  {
    id: 'deep-space-one',
    title: 'Deep Space One',
    subtitle: 'Ambient chill',
    category: 'chill',
    streamUrl: 'https://ice2.somafm.com/deepspaceone-128-mp3',
    source: 'somafm.com',
  },
]

export function getFocusCategory(categoryId) {
  return FULL_FOCUS_CATEGORIES.find((category) => category.id === categoryId) || FULL_FOCUS_CATEGORIES[0]
}

export function getStationsByCategory(categoryId) {
  return FULL_FOCUS_STATIONS.filter((station) => station.category === categoryId)
}

export function getDefaultStation(categoryId) {
  return getStationsByCategory(categoryId)[0] || FULL_FOCUS_STATIONS[0]
}
