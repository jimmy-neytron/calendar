<template>
  <Teleport to="body">
    <transition name="movie-error-overlay">
      <div v-if="modelValue" class="movie-error-modal" @mousedown.self="close">
        <section
          class="movie-error-modal__dialog"
          :class="{ 'movie-error-modal__dialog--revealed': stage === 'revealed' }"
          role="alertdialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div v-if="stage === 'vortex'" class="movie-error-modal__vortex" aria-hidden="true">
            <i /><i /><i />
          </div>

          <div v-else class="movie-error-modal__content">
            <button class="movie-error-modal__close" type="button" aria-label="Закрыть сообщение" @click="close">
              <UiIcon name="close" />
            </button>

            <div class="movie-error-modal__mark" aria-hidden="true">
              <span /><span />
              <i />
            </div>

            <div class="movie-error-modal__copy">
              <small>Ошибка подключения</small>
              <strong>{{ title }}</strong>
              <p>{{ description }}</p>
              <span v-if="hint">{{ hint }}</span>
            </div>

            <footer>
              <UiButton variant="ghost" @click="close">Закрыть</UiButton>
              <UiButton variant="secondary" icon="refresh" @click="$emit('retry')">
                Попробовать снова
              </UiButton>
            </footer>
          </div>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  description: string
  hint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  retry: []
}>()

const stage = ref<'vortex' | 'revealed'>('vortex')
let revealTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.modelValue,
  (open) => {
    clearTimeout(revealTimer)
    if (!open) {
      stage.value = 'vortex'
      document.documentElement.style.overflow = ''
      return
    }

    document.documentElement.style.overflow = 'hidden'
    stage.value = 'vortex'
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    revealTimer = setTimeout(() => {
      stage.value = 'revealed'
    }, reducedMotion ? 20 : 680)
  },
  { immediate: true },
)

function close(): void {
  emit('update:modelValue', false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue) close()
}

window.addEventListener('keydown', handleKeydown)
onBeforeUnmount(() => {
  clearTimeout(revealTimer)
  window.removeEventListener('keydown', handleKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.movie-error-modal{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.7);backdrop-filter:blur(12px)}
.movie-error-modal__dialog{position:relative;width:82px;height:82px;border:1px solid color-mix(in srgb,var(--danger) 45%,var(--border-color));border-radius:50%;background:var(--card-solid);box-shadow:0 20px 70px rgba(0,0,0,.58);overflow:hidden;animation:movieErrorSeed .3s cubic-bezier(.34,1.56,.64,1) both}
.movie-error-modal__dialog--revealed{width:min(620px,100%);height:auto;min-height:300px;border-radius:24px;animation:movieErrorBecomeModal .58s cubic-bezier(.22,1,.36,1) both}
.movie-error-modal__vortex{position:absolute;inset:8px}
.movie-error-modal__vortex i{position:absolute;inset:0;border:2px solid transparent;border-top-color:var(--danger);border-radius:50%;animation:movieErrorSpin .48s linear infinite}
.movie-error-modal__vortex i:nth-child(2){inset:10px;border-top-color:var(--orange);animation:movieErrorSpinReverse .38s linear infinite}
.movie-error-modal__vortex i:nth-child(3){inset:20px;border-top-color:var(--pink);animation-duration:.3s}
.movie-error-modal__content{position:relative;display:grid;grid-template-columns:82px minmax(0,1fr);align-items:center;gap:18px;min-height:300px;padding:34px;animation:movieErrorContentEnter .38s .12s both}
.movie-error-modal__close{position:absolute;top:14px;right:14px;display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:50%;color:var(--text-secondary);background:var(--control-bg)}
.movie-error-modal__mark{position:relative;display:grid;place-items:center;width:78px;height:78px;border:1px solid color-mix(in srgb,var(--danger) 48%,var(--border-color));border-radius:50%;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.2),transparent 34%),var(--danger);box-shadow:0 18px 52px color-mix(in srgb,var(--danger) 27%,transparent);animation:movieErrorMarkPulse .62s cubic-bezier(.22,1,.36,1) both}
.movie-error-modal__mark>span{position:absolute;width:36px;height:3px;border-radius:4px;background:#fff;transform-origin:center;animation:movieErrorCrossLine .32s .18s var(--ease-out) both}
.movie-error-modal__mark>span:first-child{transform:rotate(45deg)}
.movie-error-modal__mark>span:nth-child(2){transform:rotate(-45deg);animation-delay:.25s}
.movie-error-modal__mark>i{position:absolute;inset:-10px;border:1px solid color-mix(in srgb,var(--danger) 42%,transparent);border-radius:50%;animation:movieErrorOrbit .72s var(--ease-out) both}
.movie-error-modal__copy{min-width:0}
.movie-error-modal__copy small{display:block;margin-bottom:5px;color:var(--danger);font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
.movie-error-modal__copy strong{display:block;padding-right:30px;font-size:22px;line-height:1.1;letter-spacing:-.025em}
.movie-error-modal__copy p{margin:9px 0 0;color:var(--text-secondary);font-size:13px}
.movie-error-modal__copy>span{display:block;margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.5}
.movie-error-modal footer{grid-column:1/-1;display:flex;justify-content:flex-end;gap:7px;margin-top:12px;padding-top:16px;border-top:1px solid var(--border-color)}
.movie-error-overlay-enter-active,.movie-error-overlay-leave-active{transition:opacity .24s var(--ease-out)}
.movie-error-overlay-enter-from,.movie-error-overlay-leave-to{opacity:0}
@keyframes movieErrorSeed{from{opacity:0;transform:scale(.35) rotate(-60deg)}to{opacity:1;transform:scale(1)}}
@keyframes movieErrorBecomeModal{
  0%{
    width:82px;
    height:82px;
    border-radius:50%;
    box-shadow:0 20px 70px rgba(0,0,0,.58),0 0 0 0 color-mix(in srgb,var(--danger) 28%,transparent);
    transform:scale(1);
  }
  34%{
    width:min(310px,72vw);
    height:86px;
    border-radius:43px;
    box-shadow:0 20px 70px rgba(0,0,0,.58),0 0 0 12px color-mix(in srgb,var(--danger) 8%,transparent);
    transform:scaleX(1.03) scaleY(.96);
  }
  72%{
    width:min(636px,100%);
    height:312px;
    border-radius:27px;
    box-shadow:0 24px 80px rgba(0,0,0,.62),0 0 0 5px color-mix(in srgb,var(--danger) 5%,transparent);
    transform:scale(1.018);
  }
  100%{
    width:min(620px,100%);
    height:300px;
    border-radius:24px;
    box-shadow:0 20px 70px rgba(0,0,0,.58);
    transform:scale(1);
  }
}
@keyframes movieErrorSpin{to{transform:rotate(360deg)}}
@keyframes movieErrorSpinReverse{to{transform:rotate(-360deg)}}
@keyframes movieErrorContentEnter{from{opacity:0;filter:blur(8px);transform:scale(.86)}to{opacity:1;filter:blur(0);transform:none}}
@keyframes movieErrorMarkPulse{0%{transform:scale(.55)}55%{transform:scale(1.13)}78%{transform:scale(.96)}100%{transform:scale(1)}}
@keyframes movieErrorCrossLine{from{width:0;opacity:0}to{width:36px;opacity:1}}
@keyframes movieErrorOrbit{0%{opacity:.8;transform:scale(.4)}100%{opacity:0;transform:scale(1.45)}}
@media(max-width:560px){.movie-error-modal{padding:10px}.movie-error-modal__dialog--revealed{min-height:390px;border-radius:20px}.movie-error-modal__content{grid-template-columns:1fr;place-items:center;min-height:390px;padding:42px 20px 20px;text-align:center}.movie-error-modal__copy strong{padding:0}.movie-error-modal footer{width:100%;grid-template-columns:1fr;display:grid}.movie-error-modal footer :deep(.ui-button){width:100%}}
@media(prefers-reduced-motion:reduce){.movie-error-modal__dialog,.movie-error-modal__vortex i,.movie-error-modal__content,.movie-error-modal__mark,.movie-error-modal__mark>span,.movie-error-modal__mark>i{animation-duration:.01ms!important;animation-delay:0ms!important}}
</style>
