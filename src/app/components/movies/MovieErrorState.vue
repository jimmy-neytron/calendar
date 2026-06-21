<template>
  <div class="movie-error-shell" role="alert">
    <div
      v-if="stage === 'vortex'"
      class="movie-error-card movie-error-card--vortex"
      aria-hidden="true"
    >
      <div class="movie-error-card__ghost">
        <span />
        <div><i /><i /></div>
      </div>
      <div class="movie-error-card__vortex"><i /><i /><i /></div>
    </div>

    <div v-else class="movie-error-result">
      <div class="movie-error-result__visual">
        <span class="movie-error-result__orbit" />
        <span class="movie-error-result__mark">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </span>
      </div>
      <div class="movie-error-result__copy">
        <strong>{{ title }}</strong>
        <p>{{ description }}</p>
        <small v-if="hint">{{ hint }}</small>
      </div>
      <UiButton v-if="retryable" variant="secondary" icon="refresh" @click="$emit('retry')">
        Попробовать снова
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'

const props = withDefaults(defineProps<{
  title?: string
  description: string
  hint?: string
  retryable?: boolean
}>(), {
  title: 'Что-то пошло не так',
  hint: '',
  retryable: true,
})

defineEmits<{ retry: [] }>()

const stage = ref<'vortex' | 'error'>('vortex')
let animationTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.description,
  () => {
    clearTimeout(animationTimer)
    stage.value = 'vortex'
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    animationTimer = setTimeout(() => {
      stage.value = 'error'
    }, reducedMotion ? 20 : 620)
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimeout(animationTimer))
</script>

<style scoped>
.movie-error-shell{min-height:130px;display:grid;place-items:center}.movie-error-card{position:relative;width:100%;min-height:118px;border:1px solid color-mix(in srgb,var(--danger) 24%,var(--border-color));border-radius:var(--radius-xl);background:var(--panel-bg);overflow:hidden;transform-origin:center}.movie-error-card__ghost{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:14px;padding:22px;opacity:.55}.movie-error-card__ghost>span{width:52px;height:52px;border-radius:16px;background:color-mix(in srgb,var(--danger) 12%,transparent)}.movie-error-card__ghost div{display:grid;gap:9px}.movie-error-card__ghost i{display:block;width:46%;height:9px;border-radius:var(--radius-pill);background:var(--control-bg-hover)}.movie-error-card__ghost i:last-child{width:78%;height:7px}.movie-error-card__vortex{position:absolute;z-index:3;inset:50% auto auto 50%;width:74px;height:74px;opacity:0;transform:translate(-50%,-50%)}.movie-error-card__vortex i{position:absolute;inset:0;border:2px solid transparent;border-top-color:var(--danger);border-radius:50%}.movie-error-card__vortex i:nth-child(2){inset:9px;border-top-color:var(--orange);transform:rotate(120deg)}.movie-error-card__vortex i:nth-child(3){inset:19px;border-top-color:var(--pink);transform:rotate(240deg)}.movie-error-card--vortex{animation:movieErrorCollapse .62s cubic-bezier(.7,0,.2,1) both}.movie-error-card--vortex .movie-error-card__ghost{animation:movieErrorContentVanish .38s ease-in both}.movie-error-card--vortex .movie-error-card__vortex{animation:movieErrorVortexAppear .62s cubic-bezier(.2,.8,.2,1) both}.movie-error-card--vortex .movie-error-card__vortex i:first-child{animation:movieErrorSpin .48s linear infinite}.movie-error-card--vortex .movie-error-card__vortex i:nth-child(2){animation:movieErrorSpinReverse .38s linear infinite}.movie-error-card--vortex .movie-error-card__vortex i:nth-child(3){animation:movieErrorSpin .3s linear infinite}.movie-error-result{width:100%;display:grid;grid-template-columns:76px minmax(0,1fr) auto;align-items:center;gap:16px;min-height:118px;border:1px solid color-mix(in srgb,var(--danger) 28%,var(--border-color));border-radius:var(--radius-xl);padding:18px;background:radial-gradient(circle at 42px 42px,color-mix(in srgb,var(--danger) 12%,transparent),transparent 100px),var(--panel-bg);animation:movieErrorEnter .34s cubic-bezier(.34,1.56,.64,1) both}.movie-error-result__visual{position:relative;display:grid;place-items:center;width:70px;height:70px}.movie-error-result__orbit{position:absolute;width:70px;height:70px;border:1px solid color-mix(in srgb,var(--danger) 38%,transparent);border-radius:50%;animation:movieErrorOrbit .72s var(--ease-out) both}.movie-error-result__mark{position:relative;display:grid;place-items:center;width:58px;height:58px;border:1px solid color-mix(in srgb,var(--danger) 45%,var(--border-color));border-radius:50%;color:#fff;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.18),transparent 35%),var(--danger);box-shadow:0 15px 45px color-mix(in srgb,var(--danger) 25%,transparent);animation:movieErrorPulse .64s cubic-bezier(.22,1,.36,1) both}.movie-error-result__mark svg{width:29px;height:29px;stroke:currentColor;stroke-width:2.5;stroke-linecap:round}.movie-error-result__mark path{stroke-dasharray:30;stroke-dashoffset:30;animation:movieErrorCrossDraw .38s .12s var(--ease-out) forwards}.movie-error-result__copy{animation:movieErrorText .3s .16s both}.movie-error-result strong{display:block;font-size:15px}.movie-error-result p{margin:3px 0 0;color:var(--text-secondary)}.movie-error-result small{display:block;margin-top:5px;color:var(--text-muted)}@keyframes movieErrorContentVanish{to{opacity:0;transform:scale(.82);filter:blur(5px)}}@keyframes movieErrorCollapse{0%{opacity:1;transform:scale(1);border-radius:var(--radius-xl)}55%{opacity:.92;transform:scale(.72) rotate(3deg);border-radius:32px}100%{opacity:0;transform:scale(.16) rotate(-220deg);border-radius:50%}}@keyframes movieErrorVortexAppear{0%{opacity:0;transform:translate(-50%,-50%) scale(.35)}30%,78%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.9)}}@keyframes movieErrorSpin{to{transform:rotate(360deg)}}@keyframes movieErrorSpinReverse{to{transform:rotate(-360deg)}}@keyframes movieErrorEnter{from{opacity:0;transform:scale(.55) rotate(12deg)}to{opacity:1;transform:scale(1)}}@keyframes movieErrorPulse{0%{transform:scale(.72)}55%{transform:scale(1.13)}78%{transform:scale(.96)}100%{transform:scale(1)}}@keyframes movieErrorOrbit{0%{opacity:.8;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}@keyframes movieErrorCrossDraw{to{stroke-dashoffset:0}}@keyframes movieErrorText{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@media(max-width:620px){.movie-error-result{grid-template-columns:64px minmax(0,1fr)}.movie-error-result__visual{width:60px}.movie-error-result :deep(.ui-button){grid-column:1/-1;width:100%}}@media(prefers-reduced-motion:reduce){.movie-error-card,.movie-error-card__ghost,.movie-error-card__vortex,.movie-error-card__vortex i,.movie-error-result,.movie-error-result__orbit,.movie-error-result__mark,.movie-error-result__mark path,.movie-error-result__copy{animation-duration:.01ms!important;animation-delay:0ms!important}}
</style>
