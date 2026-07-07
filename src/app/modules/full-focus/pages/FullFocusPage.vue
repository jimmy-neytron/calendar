<template>
  <section class="full-focus" :class="{ 'is-playing': isPlaying }" :style="{ '--focus-accent': activeMood.accent }">
    <div class="focus-aura">
      <span v-for="ring in 5" :key="ring" :style="{ '--i': ring }" />
    </div>

    <header class="focus-hero">
      <RouterLink class="focus-back" :to="{ name: 'sport' }">
        <UiIcon name="left" /> Спорт
      </RouterLink>
      <div>
        <span class="focus-kicker"><UiIcon name="music" /> Full Focus</span>
        <h1>Фокус-радио</h1>
        <p>Выбери настроение, включи музыку и оставь экран как спокойный визуальный фон.</p>
      </div>
    </header>

    <section class="focus-layout">
      <article class="mood-panel glass-panel">
        <header>
          <small>Настроение</small>
          <h2>Что включаем?</h2>
        </header>

        <div class="mood-grid">
          <button
            v-for="mood in moods"
            :key="mood.id"
            type="button"
            :class="{ active: selectedMood === mood.id }"
            @click="selectMood(mood.id)"
          >
            <span :style="{ background: mood.accent }" />
            <strong>{{ mood.label }}</strong>
            <small>{{ mood.description }}</small>
          </button>
        </div>
      </article>

      <aside class="player-card glass-panel">
        <div class="now-playing">
          <span :class="{ active: isPlaying }">{{ isPlaying ? 'Играет' : 'Готово' }}</span>
          <small>{{ activeMood.label }}</small>
        </div>

        <div class="cover-effect" :class="{ active: isPlaying }">
          <i v-for="bar in 36" :key="bar" :style="{ '--i': bar }" />
          <strong>{{ activeStation.title }}</strong>
        </div>

        <div class="station-copy">
          <h2>{{ activeStation.title }}</h2>
          <p>{{ activeStation.subtitle }} · {{ activeStation.source }}</p>
        </div>

        <div class="station-list">
          <button
            v-for="station in moodStations"
            :key="station.id"
            type="button"
            :class="{ active: station.id === activeStation.id }"
            @click="selectStation(station)"
          >
            <strong>{{ station.title }}</strong>
            <small>{{ station.subtitle }}</small>
          </button>
        </div>

        <div class="player-actions">
          <UiButton size="lg" :icon="isPlaying ? 'pause' : 'play'" @click="togglePlayback">
            {{ isPlaying ? 'Пауза' : 'Играть' }}
          </UiButton>
          <UiButton variant="secondary" size="lg" icon="refresh" @click="pickNextStation">
            Дальше
          </UiButton>
        </div>

        <label class="volume-control">
          <span><UiIcon name="volume" /> Громкость</span>
          <input v-model.number="volume" type="range" min="0" max="1" step="0.01">
          <b>{{ volumePercent }}%</b>
        </label>

        <p v-if="playbackError" class="focus-error">{{ playbackError }}</p>
        <audio ref="audioRef" :src="activeStation.streamUrl" preload="none" @error="handleAudioError" />
      </aside>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { useLocalStorage } from '../../../composables/storage/useLocalStorage.js'
import {
  FULL_FOCUS_CATEGORIES,
  FULL_FOCUS_STATIONS,
  getDefaultStation,
  getFocusCategory,
  getStationsByCategory,
} from '../constants/fullFocusStations.js'

const moods = FULL_FOCUS_CATEGORIES
const allStations = FULL_FOCUS_STATIONS
const audioRef = ref(null)
const isPlaying = ref(false)
const playbackError = ref('')

const { state: focusSettings } = useLocalStorage('full-focus-settings', {
  category: 'lofi-hiphop',
  stationId: '',
  volume: 0.72,
})

const selectedMood = computed(() => focusSettings.value.category)
const activeMood = computed(() => getFocusCategory(selectedMood.value))
const moodStations = computed(() => getStationsByCategory(selectedMood.value))
const activeStation = computed(() => (
  allStations.find((station) => station.id === focusSettings.value.stationId)
  || getDefaultStation(selectedMood.value)
))
const volume = computed({
  get: () => focusSettings.value.volume,
  set: (value) => {
    focusSettings.value = { ...focusSettings.value, volume: clampVolume(value) }
  },
})
const volumePercent = computed(() => Math.round(volume.value * 100))

watch(activeStation, async () => {
  playbackError.value = ''
  if (!audioRef.value) return
  audioRef.value.pause()
  audioRef.value.load()
  if (isPlaying.value) {
    await nextTick()
    playAudio()
  }
})

watch(volume, (value) => {
  if (audioRef.value) audioRef.value.volume = value
}, { immediate: true })

function selectMood(moodId) {
  const station = getDefaultStation(moodId)
  focusSettings.value = { ...focusSettings.value, category: moodId, stationId: station.id }
}

function selectStation(station) {
  focusSettings.value = { ...focusSettings.value, category: station.category, stationId: station.id }
}

function pickNextStation() {
  const stations = moodStations.value.length ? moodStations.value : allStations
  const currentIndex = stations.findIndex((station) => station.id === activeStation.value.id)
  selectStation(stations[(currentIndex + 1) % stations.length])
}

function handleAudioError() {
  if (!isPlaying.value) return
  isPlaying.value = false
  playbackError.value = 'Эта станция сейчас недоступна. Нажми «Дальше» и попробуй другой поток.'
}

async function togglePlayback() {
  if (isPlaying.value) {
    audioRef.value?.pause()
    isPlaying.value = false
    return
  }
  await playAudio()
}

async function playAudio() {
  playbackError.value = ''
  try {
    if (audioRef.value) audioRef.value.volume = volume.value
    await audioRef.value?.play()
    isPlaying.value = true
  } catch (error) {
    isPlaying.value = false
    playbackError.value = 'Поток не запустился. Попробуй другую станцию или нажми еще раз.'
  }
}

function clampVolume(value) {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return 0.72
  return Math.min(1, Math.max(0, normalized))
}
</script>

<style scoped>
.full-focus{position:relative;display:grid;gap:18px;min-height:calc(100vh - var(--header-height) - 28px);overflow:hidden;border-radius:30px;padding:24px;background:radial-gradient(circle at 12% 14%,color-mix(in srgb,var(--focus-accent) 26%,transparent),transparent 280px),linear-gradient(135deg,#08111f,#121827 52%,#07131b);color:#fff;animation:fadeSlideUp .38s var(--ease-out)}.focus-aura{position:absolute;inset:0;overflow:hidden;pointer-events:none}.focus-aura span{position:absolute;left:50%;top:48%;width:calc(160px + var(--i)*120px);aspect-ratio:1;border:1px solid color-mix(in srgb,var(--focus-accent) 24%,transparent);border-radius:48% 52% 44% 56%;opacity:.32;transform:translate(-50%,-50%) rotate(calc(var(--i)*18deg));filter:blur(.2px)}.full-focus.is-playing .focus-aura span{animation:focusBlob calc(8s + var(--i)*1s) ease-in-out infinite alternate}.focus-hero{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.focus-back{display:inline-flex;align-items:center;gap:6px;width:max-content;color:rgba(255,255,255,.68);font-size:12px;text-decoration:none}.focus-kicker{display:inline-flex;align-items:center;gap:7px;width:max-content;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 10px;color:#dbeafe;background:rgba(255,255,255,.08);font-size:10px;font-weight:850;text-transform:uppercase}.focus-hero h1{margin:12px 0 6px;font-size:clamp(42px,7vw,76px);line-height:.92;letter-spacing:0}.focus-hero p{max-width:540px;margin:0;color:rgba(255,255,255,.66);font-size:15px;line-height:1.5}.focus-layout{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(340px,420px);gap:14px;align-items:start}.glass-panel{border:1px solid rgba(255,255,255,.16);border-radius:26px;background:rgba(8,13,24,.52);backdrop-filter:blur(22px);box-shadow:0 28px 90px rgba(0,0,0,.28)}.mood-panel{display:grid;gap:16px;padding:20px}.mood-panel header small{color:rgba(255,255,255,.5);font-size:10px;font-weight:850;text-transform:uppercase}.mood-panel h2{margin:4px 0 0}.mood-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.mood-grid button{display:grid;grid-template-columns:auto 1fr;gap:7px 10px;min-height:110px;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:14px;color:#fff;background:rgba(255,255,255,.07);text-align:left;transition:.18s var(--ease-out)}.mood-grid button:hover{transform:translateY(-1px);background:rgba(255,255,255,.1)}.mood-grid button.active{border-color:color-mix(in srgb,var(--focus-accent) 62%,rgba(255,255,255,.18));background:color-mix(in srgb,var(--focus-accent) 16%,rgba(255,255,255,.07))}.mood-grid span{width:13px;height:13px;margin-top:2px;border-radius:999px;box-shadow:0 0 22px currentColor}.mood-grid strong{font-size:15px}.mood-grid small{grid-column:1/-1;color:rgba(255,255,255,.58);line-height:1.35}.player-card{display:grid;gap:14px;padding:18px}.now-playing{display:flex;justify-content:space-between;gap:10px;align-items:center}.now-playing span{border-radius:999px;padding:7px 10px;color:rgba(255,255,255,.58);background:rgba(255,255,255,.07);font-size:11px;font-weight:850}.now-playing span.active{color:#bbf7d0;background:rgba(34,197,94,.18)}.now-playing small{color:rgba(255,255,255,.52);font-weight:800}.cover-effect{position:relative;display:grid;place-items:center;height:210px;overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:radial-gradient(circle,color-mix(in srgb,var(--focus-accent) 36%,rgba(255,255,255,.1)),rgba(255,255,255,.05) 54%,rgba(255,255,255,.02));}.cover-effect:before{content:"";position:absolute;width:74%;aspect-ratio:1;border-radius:42% 58% 52% 48%;background:linear-gradient(135deg,color-mix(in srgb,var(--focus-accent) 68%,#fff),rgba(255,255,255,.08));filter:blur(10px);opacity:.42}.cover-effect.active:before{animation:liquidPulse 4.5s ease-in-out infinite alternate}.cover-effect i{position:absolute;bottom:24px;width:5px;height:calc(18px + (var(--i) % 9)*8px);border-radius:999px;background:#fff;opacity:.18;transform:translateX(calc((var(--i) - 18)*9px));transform-origin:bottom}.cover-effect.active i{animation:equalizer .78s ease-in-out infinite alternate;animation-delay:calc(var(--i)*-42ms);background:color-mix(in srgb,var(--focus-accent) 68%,#fff);opacity:.78}.cover-effect strong{position:relative;z-index:1;max-width:220px;text-align:center;font-size:26px;line-height:1.05;text-shadow:0 8px 28px rgba(0,0,0,.34)}.station-copy h2{margin:0}.station-copy p{margin:4px 0 0;color:rgba(255,255,255,.6)}.station-list{display:grid;gap:7px}.station-list button{display:flex;justify-content:space-between;gap:10px;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px;color:#fff;background:rgba(255,255,255,.06);text-align:left}.station-list button.active{border-color:color-mix(in srgb,var(--focus-accent) 56%,rgba(255,255,255,.18));background:color-mix(in srgb,var(--focus-accent) 14%,rgba(255,255,255,.06))}.station-list small{color:rgba(255,255,255,.5)}.player-actions{display:grid;grid-template-columns:1fr auto;gap:8px}.player-actions :deep(.ui-button--secondary){color:#fff;border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.08)}.volume-control{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.volume-control span{display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.72);font-size:12px;font-weight:800}.volume-control input{grid-column:1/-1;width:100%;accent-color:var(--focus-accent)}.volume-control b{color:rgba(255,255,255,.52);font-size:12px}.focus-error{margin:0;color:#fecaca;font-size:12px}@keyframes focusBlob{0%{border-radius:48% 52% 44% 56%;transform:translate(-50%,-50%) rotate(calc(var(--i)*18deg)) scale(.96)}100%{border-radius:57% 43% 62% 38%;transform:translate(-50%,-50%) rotate(calc(var(--i)*44deg)) scale(1.08)}}@keyframes liquidPulse{0%{border-radius:42% 58% 52% 48%;transform:scale(.96) rotate(-4deg)}50%{border-radius:58% 42% 44% 56%;transform:scale(1.06) rotate(4deg)}100%{border-radius:46% 54% 62% 38%;transform:scale(1.02) rotate(-2deg)}}@keyframes equalizer{from{height:16px;opacity:.38}to{height:calc(34px + (var(--i) % 8)*9px);opacity:.9}}@media(max-width:920px){.focus-layout{grid-template-columns:1fr}.focus-hero{display:grid}.player-card{order:-1}}@media(max-width:560px){.full-focus{min-height:calc(100vh - var(--header-height) - 18px);border-radius:22px;padding:14px}.glass-panel{border-radius:20px}.mood-panel,.player-card{padding:14px}.focus-hero h1{font-size:40px}.cover-effect{height:180px}.player-actions{grid-template-columns:1fr}.player-actions :deep(.ui-button){width:100%}.mood-grid{grid-template-columns:1fr}}
</style>
