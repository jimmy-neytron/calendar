export const WORKOUT_RADIO_STATIONS = [
  {
    id: '181-beat',
    title: 'The Beat',
    subtitle: 'Hip-Hop & R&B · USA',
    genre: 'Hip-Hop',
    accent: '#8b5cf6',
    streamUrl: 'https://listen.181fm.com/181-beat_128k.mp3',
    source: '181.fm',
  },
  {
    id: '181-power',
    title: 'Power 181',
    subtitle: 'Top 40 Pop Hits · USA',
    genre: 'Pop Hits',
    accent: '#ec4899',
    streamUrl: 'https://listen.181fm.com/181-power_128k.mp3',
    source: '181.fm',
  },
]

export function getWorkoutRadioStation(stationId) {
  return WORKOUT_RADIO_STATIONS.find((station) => station.id === stationId) || WORKOUT_RADIO_STATIONS[0]
}

