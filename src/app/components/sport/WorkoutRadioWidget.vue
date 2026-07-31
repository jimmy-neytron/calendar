<template>
  <section class="workout-radio" :class="{ playing: isPlaying }" :style="{ '--radio-accent': activeStation.accent }">
    <div class="workout-radio__identity">
      <span class="workout-radio__cover">
        <i v-for="bar in 5" :key="bar" :style="{ '--bar': bar }"></i>
      </span>
      <div>
        <small><b></b>{{ statusLabel }}</small>
        <strong>{{ activeStation.title }}</strong>
        <span>{{ activeStation.subtitle }}</span>
      </div>
    </div>

    <div class="workout-radio__stations" role="radiogroup" aria-label="Радиостанция">
      <button
        v-for="station in stations"
        :key="station.id"
        type="button"
        :class="{ active: station.id === activeStation.id }"
        :aria-checked="station.id === activeStation.id"
        role="radio"
        @click="selectStation(station.id)"
      >
        <span :style="{ background: station.accent }"></span>
        <div><strong>{{ station.genre }}</strong><small>{{ station.id === '181-beat' ? 'Urban' : 'Top 40' }}</small></div>
      </button>
    </div>

    <div class="workout-radio__controls">
      <UiButton :icon="isPlaying ? 'pause' : 'play'" @click="togglePlayback">
        {{ isPlaying ? 'Пауза' : 'Слушать' }}
      </UiButton>
      <label class="workout-radio__volume">
        <UiIcon name="volume" />
        <input v-model.number="volume" type="range" min="0" max="1" step="0.01" aria-label="Громкость">
        <span>{{ volumePercent }}%</span>
      </label>
    </div>

    <p v-if="playbackError" class="workout-radio__error">
      <UiIcon name="warning" /> {{ playbackError }}
    </p>
    <audio
      ref="audioRef"
      :src="activeStation.streamUrl"
      preload="none"
      @playing="handlePlaying"
      @pause="handlePause"
      @waiting="isLoading = true"
      @error="handleAudioError"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import { useLocalStorage } from '../../composables/storage/useLocalStorage.js'
import { getWorkoutRadioStation, WORKOUT_RADIO_STATIONS } from '../../config/workoutRadioStations.js'

const stations = WORKOUT_RADIO_STATIONS
const audioRef = ref(null)
const isPlaying = ref(false)
const isLoading = ref(false)
const playbackError = ref('')
const { state: radioSettings } = useLocalStorage('workout-radio-settings', { stationId: stations[0].id, volume: 0.65 })
const activeStation = computed(() => getWorkoutRadioStation(radioSettings.value.stationId))
const statusLabel = computed(() => isLoading.value ? 'Подключение' : (isPlaying.value ? 'В эфире' : 'Радио для тренировки'))
const volume = computed({
  get: () => radioSettings.value.volume,
  set: (value) => { radioSettings.value = { ...radioSettings.value, volume: clampVolume(value) } },
})
const volumePercent = computed(() => Math.round(volume.value * 100))

watch(volume, (value) => { if (audioRef.value) audioRef.value.volume = value }, { immediate: true })

async function selectStation(stationId) {
  if (stationId === activeStation.value.id) return
  const shouldResume = isPlaying.value
  playbackError.value = ''
  isLoading.value = shouldResume
  audioRef.value?.pause()
  radioSettings.value = { ...radioSettings.value, stationId }
  await nextTick()
  audioRef.value?.load()
  if (shouldResume) await playAudio()
}

async function togglePlayback() {
  if (isPlaying.value || isLoading.value) {
    audioRef.value?.pause()
    isPlaying.value = false
    isLoading.value = false
    return
  }
  await playAudio()
}

async function playAudio() {
  playbackError.value = ''
  isLoading.value = true
  try {
    if (audioRef.value) audioRef.value.volume = volume.value
    await audioRef.value?.play()
  } catch {
    isPlaying.value = false
    isLoading.value = false
    playbackError.value = 'Не удалось запустить поток. Попробуй ещё раз или выбери вторую станцию.'
  }
}

function handlePlaying() { isPlaying.value = true; isLoading.value = false; playbackError.value = '' }
function handlePause() { isPlaying.value = false; isLoading.value = false }
function handleAudioError() { isPlaying.value = false; isLoading.value = false; playbackError.value = 'Станция временно недоступна. Переключись на вторую.' }
function clampVolume(value) { const number = Number(value); return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0.65 }
onBeforeUnmount(() => audioRef.value?.pause())
</script>

<style scoped>
.workout-radio { position: sticky; top: calc(var(--header-height) + 8px); z-index: 8; display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; align-items: center; gap: 14px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--radio-accent) 25%, var(--border-color)); border-radius: var(--radius-lg); padding: 10px 12px; background: color-mix(in srgb, var(--panel-bg) 94%, var(--radio-accent)); box-shadow: 0 12px 35px rgba(0,0,0,.14); backdrop-filter: blur(18px); }
.workout-radio::before { position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--radio-accent); content: ''; }
.workout-radio__identity { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 10px; min-width: 0; }
.workout-radio__cover { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; gap: 3px; border-radius: 13px; color: var(--radio-accent); background: color-mix(in srgb, var(--radio-accent) 14%, var(--card-solid)); }
.workout-radio__cover i { width: 3px; height: calc(8px + var(--bar) * 3px); border-radius: 9px; background: currentColor; opacity: .65; }
.workout-radio.playing .workout-radio__cover i { animation: radioBar .65s ease-in-out infinite alternate; animation-delay: calc(var(--bar) * -80ms); }
.workout-radio__identity > div { display: grid; min-width: 0; }
.workout-radio__identity small { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 8px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.workout-radio__identity small b { width: 6px; height: 6px; border-radius: 50%; background: var(--radio-accent); box-shadow: 0 0 10px var(--radio-accent); }
.workout-radio__identity strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.workout-radio__identity > div > span { color: var(--text-secondary); font-size: 9px; }
.workout-radio__stations { display: flex; gap: 5px; }
.workout-radio__stations button { min-width: 100px; display: grid; grid-template-columns: 8px 1fr; align-items: center; gap: 7px; border: 1px solid var(--border-color); border-radius: 11px; padding: 7px 9px; color: var(--text-primary); background: var(--control-bg); text-align: left; }
.workout-radio__stations button.active { border-color: color-mix(in srgb, var(--radio-accent) 44%, var(--border-color)); background: color-mix(in srgb, var(--radio-accent) 10%, var(--control-bg)); }
.workout-radio__stations button > span { width: 7px; height: 22px; border-radius: 7px; }
.workout-radio__stations button div { display: grid; }
.workout-radio__stations strong { font-size: 10px; }.workout-radio__stations small { color: var(--text-muted); font-size: 8px; }
.workout-radio__controls { display: flex; align-items: center; gap: 9px; }
.workout-radio__volume { display: grid; grid-template-columns: auto 74px auto; align-items: center; gap: 5px; color: var(--text-muted); font-size: 10px; }
.workout-radio__volume input { width: 74px; accent-color: var(--radio-accent); }
.workout-radio__error { grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; margin: -4px 0 0; color: var(--danger); font-size: 10px; }
@keyframes radioBar { from { height: 7px; opacity: .45; } to { height: calc(13px + var(--bar) * 3px); opacity: 1; } }
@media (max-width: 900px) { .workout-radio { grid-template-columns: 1fr auto; }.workout-radio__stations { grid-row: 2; grid-column: 1 / -1; }.workout-radio__controls { justify-content: flex-end; } }
@media (max-width: 600px) { .workout-radio { position: static; grid-template-columns: 1fr; }.workout-radio__stations, .workout-radio__controls { grid-column: 1; }.workout-radio__stations button { flex: 1; }.workout-radio__controls { justify-content: space-between; }.workout-radio__volume { grid-template-columns: auto 1fr auto; flex: 1; }.workout-radio__volume input { width: 100%; } }
</style>

