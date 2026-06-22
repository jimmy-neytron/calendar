<template>
  <Teleport to="body">
    <Transition name="onboarding-prompt">
      <section
          v-if="isPromptOpen"
          class="learning-prompt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="learning-prompt-title"
      >
        <div class="learning-prompt__backdrop"/>
        <article class="learning-prompt__card">
          <div class="learning-prompt__orb" aria-hidden="true"><UiIcon name="sparkles"/></div>
          <span class="learning-prompt__eyebrow">Добро пожаловать</span>
          <h2 id="learning-prompt-title">Показать, как всё устроено?</h2>
          <p>Короткое интерактивное обучение познакомит с календарём, фильмами, спортом, аналитикой и другими разделами.</p>
          <div class="learning-prompt__meta">
            <span><UiIcon name="play"/> 9 шагов</span>
            <span><UiIcon name="activity"/> около 2 минут</span>
          </div>
          <div class="learning-prompt__actions">
            <button type="button" class="prompt-button prompt-button--secondary" @click="declinePrompt">
              Не сейчас
            </button>
            <button type="button" class="prompt-button prompt-button--primary" @click="acceptPrompt">
              Пройти обучение <UiIcon name="right"/>
            </button>
          </div>
          <small>Обучение всегда можно запустить заново в настройках.</small>
        </article>
      </section>
    </Transition>

    <Transition name="onboarding-shell">
      <section
          v-if="isOpen"
          class="onboarding"
          :style="{ '--step-color': currentStep.color }"
          role="dialog"
          aria-modal="true"
          aria-label="Обучение по приложению"
      >
        <div class="onboarding__ambient" aria-hidden="true">
          <i/><i/><i/>
        </div>

        <header class="onboarding__header">
          <div class="onboarding__brand">
            <span><UiIcon name="sparkles"/></span>
            <div><strong>Быстрый старт</strong><small>{{ currentIndex + 1 }} из {{ steps.length }}</small></div>
          </div>
          <button type="button" class="onboarding__close" aria-label="Закрыть обучение" @click="close">
            <UiIcon name="close"/>
          </button>
        </header>

        <div class="onboarding__progress"><i :style="{ width: `${progress}%` }"/></div>

        <main class="onboarding__stage">
          <nav class="onboarding__steps" aria-label="Шаги обучения">
            <button
                v-for="(step, index) in steps"
                :key="step.id"
                type="button"
                :class="{ active: index === currentIndex, passed: index < currentIndex }"
                :aria-label="step.title"
                @click="goTo(index)"
            >
              <span><UiIcon :name="index < currentIndex ? 'check' : step.icon"/></span>
              <div><small>{{
                  String(index + 1).padStart(2, '0')
                }}</small><strong>{{ step.id === 'welcome' ? 'Начало' : step.title }}</strong></div>
            </button>
          </nav>

          <div class="onboarding__content">
            <Transition :name="direction > 0 ? 'tour-next' : 'tour-prev'" mode="out-in">
              <article :key="currentStep.id" class="tour-slide">
                <div class="tour-slide__copy">
                  <span class="tour-slide__eyebrow">{{ currentStep.eyebrow }}</span>
                  <h1>{{ currentStep.title }}</h1>
                  <p>{{ currentStep.description }}</p>

                  <ul>
                    <li v-for="benefit in currentStep.benefits" :key="benefit">
                      <span><UiIcon name="check"/></span>{{ benefit }}
                    </li>
                  </ul>

                  <RouterLink
                      v-if="currentStep.routeName"
                      class="tour-slide__route"
                      :to="{ name: currentStep.routeName }"
                      @click="close"
                  >
                    Открыть раздел
                    <UiIcon name="right"/>
                  </RouterLink>
                </div>

                <div class="tour-visual" :class="`tour-visual--${currentStep.visual}`" aria-hidden="true">
                  <div class="tour-visual__window">
                    <div class="tour-visual__top"><i/><i/><i/><span/></div>
                    <div class="tour-visual__body">
                      <span class="tour-visual__icon"><UiIcon :name="currentStep.icon"/></span>
                      <div class="tour-visual__lines"><i/><i/><i/></div>
                      <div class="tour-visual__cards"><i/><i/><i/></div>
                      <div class="tour-visual__chart"><i v-for="bar in 7" :key="bar"
                                                         :style="{ '--bar': `${28 + ((bar * 19) % 64)}%`, '--bar-delay': `${bar * 70}ms` }"/>
                      </div>
                    </div>
                  </div>
                  <span class="tour-visual__badge"><UiIcon :name="currentStep.icon"/></span>
                </div>
              </article>
            </Transition>
          </div>
        </main>

        <footer class="onboarding__footer">
          <button type="button" class="tour-button tour-button--ghost" :disabled="isFirst" @click="previous">
            <UiIcon name="left"/>
            Назад
          </button>
          <div class="onboarding__dots">
            <button
                v-for="(_, index) in steps"
                :key="index"
                type="button"
                :class="{ active: index === currentIndex }"
                :aria-label="`Шаг ${index + 1}`"
                @click="goTo(index)"
            />
          </div>
          <button type="button" class="tour-button tour-button--primary" @click="next">
            {{ currentStep.action }}
            <UiIcon :name="isLast ? 'check' : 'right'"/>
          </button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import {onBeforeUnmount, watch} from 'vue'
import UiIcon from '../ui/UiIcon.vue'
import {useOnboarding} from '../../composables/onboarding/useOnboarding.js'

const {
  steps, isOpen, isPromptOpen, currentIndex, currentStep, progress, direction,
  isFirst, isLast, next, previous, goTo, close, acceptPrompt, declinePrompt,
} = useOnboarding()

function handleKeydown(event) {
  if (!isOpen.value) return
  if (event.key === 'Escape') close()
  if (event.key === 'ArrowRight') next()
  if (event.key === 'ArrowLeft') previous()
}

watch([isOpen, isPromptOpen], ([tourOpen, promptOpen]) => {
  const open = tourOpen || promptOpen
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (tourOpen) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
}, {immediate: true})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.learning-prompt {
  position: fixed;
  inset: 0;
  z-index: 1001;
  display: grid;
  place-items: center;
  padding: 20px;
}

.learning-prompt__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .72);
  backdrop-filter: blur(14px);
}

.learning-prompt__card {
  position: relative;
  display: grid;
  justify-items: center;
  overflow: hidden;
  width: min(100%, 520px);
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 26px;
  padding: 38px 38px 30px;
  color: #f5f5f5;
  background: linear-gradient(145deg, rgba(24, 24, 24, .98), rgba(7, 7, 7, .99));
  box-shadow: 0 35px 110px rgba(0, 0, 0, .68), inset 0 1px 0 rgba(255, 255, 255, .055);
  text-align: center;
}

.learning-prompt__card::before {
  position: absolute;
  top: -180px;
  left: 50%;
  width: 390px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(96, 165, 250, .22), transparent 68%);
  content: "";
  transform: translateX(-50%);
  animation: promptGlow 4s ease-in-out infinite;
}

.learning-prompt__card::after {
  position: absolute;
  inset: 0;
  opacity: .23;
  background-image:
    linear-gradient(rgba(255, 255, 255, .045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .045) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(#000, transparent 72%);
  content: "";
  pointer-events: none;
}

.learning-prompt__orb {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin-bottom: 22px;
  border: 1px solid rgba(96, 165, 250, .32);
  border-radius: 23px;
  color: var(--info);
  background: rgba(96, 165, 250, .12);
  box-shadow: 0 18px 50px rgba(96, 165, 250, .13);
  font-size: 31px;
  animation: promptIcon 3s ease-in-out infinite;
}

.learning-prompt__eyebrow {
  position: relative;
  z-index: 1;
  color: var(--info);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.learning-prompt h2 {
  position: relative;
  z-index: 1;
  margin: 8px 0 12px;
  font-size: clamp(27px, 5vw, 38px);
  letter-spacing: -.045em;
}

.learning-prompt p {
  position: relative;
  z-index: 1;
  max-width: 410px;
  margin: 0;
  color: #a5a5a5;
  font-size: 12px;
  line-height: 1.65;
}

.learning-prompt__meta {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  margin-top: 22px;
}

.learning-prompt__meta span {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, .075);
  border-radius: 999px;
  padding: 6px 9px;
  color: #898989;
  background: rgba(255, 255, 255, .035);
  font-size: 9px;
}

.learning-prompt__actions {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1.45fr;
  gap: 8px;
  width: 100%;
  margin-top: 28px;
}

.prompt-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 43px;
  border-radius: 999px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 800;
  transition: transform .22s var(--ease-out), background .22s, border-color .22s;
}

.prompt-button:hover {
  transform: translateY(-2px);
}

.prompt-button--secondary {
  border: 1px solid rgba(255, 255, 255, .1);
  color: #aaa;
  background: rgba(255, 255, 255, .045);
}

.prompt-button--secondary:hover {
  color: #fff;
  background: rgba(255, 255, 255, .08);
}

.prompt-button--primary {
  border: 1px solid #f1f1f1;
  color: #050505;
  background: #f1f1f1;
  box-shadow: 0 14px 38px rgba(255, 255, 255, .1);
}

.learning-prompt__card > small {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  color: #5f5f5f;
  font-size: 8px;
}

.onboarding-prompt-enter-active {
  animation: promptBackdropIn .45s var(--ease-out);
}

.onboarding-prompt-enter-active .learning-prompt__card {
  animation: promptCardIn .58s .05s var(--ease-out) both;
}

.onboarding-prompt-leave-active {
  animation: promptBackdropOut .25s ease-in both;
}

.onboarding-prompt-leave-active .learning-prompt__card {
  animation: promptCardOut .24s ease-in both;
}

.onboarding {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  grid-template-rows:auto 3px minmax(0, 1fr) auto;
  overflow: hidden;
  color: var(--text-primary);
  background: linear-gradient(145deg, #050505 0%, #0a0a0a 48%, color-mix(in srgb, var(--step-color) 7%, #050505) 100%);
  isolation: isolate
}

.onboarding::before {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .28;
  background-image: linear-gradient(rgba(255, 255, 255, .05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .05) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(circle at 65% 45%, #000, transparent 68%);
  content: "";
  animation: tourGrid 18s linear infinite
}

.onboarding__ambient {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none
}

.onboarding__ambient i {
  position: absolute;
  border-radius: 50%;
  filter: blur(16px);
  opacity: .23;
  background: var(--step-color);
  animation: ambientFloat 8s ease-in-out infinite
}

.onboarding__ambient i:nth-child(1) {
  top: -16%;
  right: 8%;
  width: 36vw;
  height: 36vw
}

.onboarding__ambient i:nth-child(2) {
  bottom: -24%;
  left: 22%;
  width: 28vw;
  height: 28vw;
  animation-delay: -3s
}

.onboarding__ambient i:nth-child(3) {
  top: 35%;
  left: -12%;
  width: 20vw;
  height: 20vw;
  opacity: .1;
  animation-delay: -5s
}

.onboarding__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 14px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  background: rgba(5, 5, 5, .46);
  backdrop-filter: blur(18px)
}

.onboarding__brand {
  display: flex;
  align-items: center;
  gap: 10px
}

.onboarding__brand > span {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--step-color) 25%, transparent);
  border-radius: 11px;
  color: var(--step-color);
  background: color-mix(in srgb, var(--step-color) 10%, transparent)
}

.onboarding__brand strong, .onboarding__brand small {
  display: block
}

.onboarding__brand small {
  color: #777;
  font-size: 9px
}

.onboarding__close {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 50%;
  color: #aaa;
  background: rgba(255, 255, 255, .045);
  font-size: 18px;
  transition: transform .25s var(--ease-out), color .25s, background .25s
}

.onboarding__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, .1);
  transform: rotate(90deg)
}

.onboarding__progress {
  overflow: hidden;
  background: rgba(255, 255, 255, .045)
}

.onboarding__progress i {
  display: block;
  height: 100%;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, var(--step-color), color-mix(in srgb, var(--step-color) 50%, white));
  box-shadow: 0 0 16px var(--step-color);
  transition: width .55s var(--ease-out)
}

.onboarding__stage {
  display: grid;
  grid-template-columns:250px minmax(0, 1fr);
  min-height: 0
}

.onboarding__steps {
  display: grid;
  align-content: center;
  gap: 5px;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, .07);
  padding: 22px 18px;
  background: rgba(5, 5, 5, .3);
  backdrop-filter: blur(12px)
}

.onboarding__steps button {
  display: grid;
  grid-template-columns:34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 8px;
  color: #777;
  background: transparent;
  text-align: left;
  transition: color .25s, background .25s, border-color .25s, transform .25s var(--ease-out)
}

.onboarding__steps button:hover {
  color: #bbb;
  background: rgba(255, 255, 255, .035);
  transform: translateX(3px)
}

.onboarding__steps button.active {
  color: #fff;
  border-color: color-mix(in srgb, var(--step-color) 25%, transparent);
  background: color-mix(in srgb, var(--step-color) 9%, transparent)
}

.onboarding__steps button.passed {
  color: #999
}

.onboarding__steps button > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, .045);
  font-size: 15px
}

.onboarding__steps button.active > span {
  color: var(--step-color);
  background: color-mix(in srgb, var(--step-color) 13%, transparent);
  box-shadow: 0 0 22px color-mix(in srgb, var(--step-color) 12%, transparent)
}

.onboarding__steps small, .onboarding__steps strong {
  display: block
}

.onboarding__steps small {
  color: #555;
  font-size: 8px
}

.onboarding__steps strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap
}

.onboarding__content {
  display: grid;
  place-items: center;
  min-width: 0;
  overflow: hidden;
  padding: clamp(24px, 5vw, 72px)
}

.tour-slide {
  display: grid;
  grid-template-columns:minmax(320px, .85fr) minmax(390px, 1.15fr);
  align-items: center;
  gap: clamp(32px, 7vw, 100px);
  width: min(100%, 1120px)
}

.tour-slide__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--step-color);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .15em;
  text-transform: uppercase
}

.tour-slide__eyebrow::before {
  width: 24px;
  height: 1px;
  background: currentColor;
  content: ""
}

.tour-slide h1 {
  color: white;
  max-width: 640px;
  margin: 13px 0 17px;
  font-size: 3.2rem;
  line-height: .96;
  letter-spacing: -.06em
}

.tour-slide p {
  max-width: 620px;
  margin: 0;
  color: #aaa;
  font-size: clamp(13px, 1.3vw, 16px);
  line-height: 1.65
}

.tour-slide ul {
  display: grid;
  gap: 10px;
  margin: 25px 0 0;
  padding: 0;
  list-style: none
}

.tour-slide li {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #d0d0d0;
  font-size: 11px
}

.tour-slide li span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--step-color);
  background: color-mix(in srgb, var(--step-color) 11%, transparent);
  font-size: 11px
}

.tour-slide__route {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 25px;
  color: var(--step-color);
  font-size: 10px;
  font-weight: 800;
  text-decoration: none
}

.tour-slide__route svg {
  transition: transform .2s
}

.tour-slide__route:hover svg {
  transform: translateX(4px)
}

.tour-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 430px;
  perspective: 1200px
}

.tour-visual::before {
  position: absolute;
  width: 72%;
  height: 72%;
  border: 1px solid color-mix(in srgb, var(--step-color) 15%, transparent);
  border-radius: 50%;
  content: "";
  animation: visualOrbit 12s linear infinite
}

.tour-visual::after {
  position: absolute;
  width: 52%;
  height: 52%;
  border: 1px dashed color-mix(in srgb, var(--step-color) 24%, transparent);
  border-radius: 50%;
  content: "";
  animation: visualOrbit 9s linear infinite reverse
}

.tour-visual__window {
  position: relative;
  z-index: 1;
  width: min(100%, 540px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(25, 25, 25, .94), rgba(8, 8, 8, .96));
  box-shadow: 0 40px 100px rgba(0, 0, 0, .5), 0 0 80px color-mix(in srgb, var(--step-color) 9%, transparent);
  transform: rotateY(-8deg) rotateX(3deg);
  animation: windowLand .8s .12s var(--ease-out) both, windowFloat 5s 1s ease-in-out infinite
}

.tour-visual__top {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 43px;
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  padding: 0 14px;
  background: rgba(255, 255, 255, .025)
}

.tour-visual__top i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #444
}

.tour-visual__top i:first-child {
  background: var(--step-color)
}

.tour-visual__top span {
  width: 34%;
  height: 7px;
  margin-left: auto;
  border-radius: 10px;
  background: rgba(255, 255, 255, .06)
}

.tour-visual__body {
  position: relative;
  display: grid;
  grid-template-columns:52px 1fr;
  gap: 16px;
  min-height: 300px;
  padding: 24px
}

.tour-visual__icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 1px solid color-mix(in srgb, var(--step-color) 24%, transparent);
  border-radius: 16px;
  color: var(--step-color);
  background: color-mix(in srgb, var(--step-color) 11%, transparent);
  font-size: 24px;
  animation: iconBreathe 2.6s ease-in-out infinite
}

.tour-visual__lines {
  display: grid;
  align-content: start;
  gap: 9px;
  padding-top: 8px
}

.tour-visual__lines i {
  height: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, .1);
  animation: lineReveal .55s var(--ease-out) both
}

.tour-visual__lines i:nth-child(1) {
  width: 48%
}

.tour-visual__lines i:nth-child(2) {
  width: 78%;
  animation-delay: .08s
}

.tour-visual__lines i:nth-child(3) {
  width: 62%;
  animation-delay: .16s
}

.tour-visual__cards {
  grid-column: 1/-1;
  display: grid;
  grid-template-columns:repeat(3, 1fr);
  gap: 9px
}

.tour-visual__cards i {
  height: 72px;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 12px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--step-color) 8%, transparent), rgba(255, 255, 255, .025));
  animation: miniCard .55s var(--ease-out) both
}

.tour-visual__cards i:nth-child(2) {
  animation-delay: .1s
}

.tour-visual__cards i:nth-child(3) {
  animation-delay: .2s
}

.tour-visual__chart {
  grid-column: 1/-1;
  display: flex;
  align-items: end;
  gap: 8px;
  height: 82px;
  border-bottom: 1px solid rgba(255, 255, 255, .08)
}

.tour-visual__chart i {
  flex: 1;
  height: var(--bar);
  border-radius: 5px 5px 1px 1px;
  background: linear-gradient(var(--step-color), color-mix(in srgb, var(--step-color) 30%, transparent));
  transform-origin: bottom;
  animation: tourBar .7s calc(.25s + var(--bar-delay)) var(--ease-out) both
}

.tour-visual__badge {
  position: absolute;
  right: 2%;
  bottom: 8%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border: 1px solid color-mix(in srgb, var(--step-color) 35%, transparent);
  border-radius: 22px;
  color: #050505;
  background: var(--step-color);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--step-color) 26%, transparent);
  font-size: 31px;
  animation: badgePop .65s .55s var(--ease-out) both
}

.onboarding__footer {
  display: grid;
  grid-template-columns:1fr auto 1fr;
  align-items: center;
  gap: 18px;
  min-height: 78px;
  border-top: 1px solid rgba(255, 255, 255, .07);
  padding: 13px 28px;
  background: rgba(5, 5, 5, .58);
  backdrop-filter: blur(18px)
}

.tour-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: max-content;
  min-height: 42px;
  border-radius: 999px;
  padding: 0 17px;
  font-size: 11px;
  font-weight: 800;
  transition: transform .2s var(--ease-out), background .2s, opacity .2s
}

.tour-button:hover:not(:disabled) {
  transform: translateY(-2px)
}

.tour-button:disabled {
  opacity: .25
}

.tour-button--ghost {
  border: 1px solid rgba(255, 255, 255, .09);
  color: #aaa;
  background: rgba(255, 255, 255, .035)
}

.tour-button--primary {
  justify-self: end;
  border: 1px solid var(--step-color);
  color: #050505;
  background: var(--step-color);
  box-shadow: 0 12px 35px color-mix(in srgb, var(--step-color) 19%, transparent)
}

.onboarding__dots {
  display: flex;
  gap: 5px
}

.onboarding__dots button {
  width: 6px;
  height: 6px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: #444;
  transition: width .3s var(--ease-out), background .3s
}

.onboarding__dots button.active {
  width: 24px;
  background: var(--step-color)
}

.onboarding-shell-enter-active {
  animation: shellIn .55s var(--ease-out)
}

.onboarding-shell-leave-active {
  animation: shellOut .32s cubic-bezier(.4, 0, 1, 1)
}

.tour-next-enter-active, .tour-prev-enter-active {
  transition: opacity .42s var(--ease-out), transform .42s var(--ease-out), filter .42s
}

.tour-next-leave-active, .tour-prev-leave-active {
  transition: opacity .2s, transform .2s, filter .2s
}

.tour-next-enter-from {
  opacity: 0;
  transform: translateX(45px) scale(.98);
  filter: blur(7px)
}

.tour-next-leave-to {
  opacity: 0;
  transform: translateX(-28px) scale(.98);
  filter: blur(5px)
}

.tour-prev-enter-from {
  opacity: 0;
  transform: translateX(-45px) scale(.98);
  filter: blur(7px)
}

.tour-prev-leave-to {
  opacity: 0;
  transform: translateX(28px) scale(.98);
  filter: blur(5px)
}

@keyframes promptBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes promptBackdropOut {
  to { opacity: 0; }
}

@keyframes promptCardIn {
  from { opacity: 0; transform: translateY(35px) scale(.88); filter: blur(10px); }
  65% { transform: translateY(-4px) scale(1.015); filter: blur(0); }
  to { opacity: 1; transform: none; }
}

@keyframes promptCardOut {
  to { opacity: 0; transform: translateY(15px) scale(.94); filter: blur(5px); }
}

@keyframes promptGlow {
  50% { transform: translateX(-50%) scale(1.15); opacity: .75; }
}

@keyframes promptIcon {
  50% {
    transform: translateY(-5px) rotate(4deg);
    box-shadow: 0 24px 60px rgba(96, 165, 250, .2);
  }
}

@keyframes shellIn {
  from {
    opacity: 0;
    clip-path: circle(0 at calc(100% - 42px) 42px)
  }
  to {
    opacity: 1;
    clip-path: circle(150% at calc(100% - 42px) 42px)
  }
}

@keyframes shellOut {
  to {
    opacity: 0;
    transform: scale(1.03);
    filter: blur(8px)
  }
}

@keyframes tourGrid {
  to {
    background-position: 46px 46px
  }
}

@keyframes ambientFloat {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1)
  }
  50% {
    transform: translate3d(-40px, 30px, 0) scale(1.12)
  }
}

@keyframes visualOrbit {
  to {
    transform: rotate(360deg)
  }
}

@keyframes windowLand {
  from {
    opacity: 0;
    transform: translateY(40px) rotateY(-20deg) rotateX(8deg) scale(.9);
    filter: blur(8px)
  }
  to {
    opacity: 1;
    transform: rotateY(-8deg) rotateX(3deg);
    filter: blur(0)
  }
}

@keyframes windowFloat {
  0%, 100% {
    transform: rotateY(-8deg) rotateX(3deg) translateY(0)
  }
  50% {
    transform: rotateY(-5deg) rotateX(1deg) translateY(-8px)
  }
}

@keyframes iconBreathe {
  50% {
    transform: scale(1.08);
    box-shadow: 0 0 28px color-mix(in srgb, var(--step-color) 18%, transparent)
  }
}

@keyframes lineReveal {
  from {
    opacity: 0;
    transform: scaleX(0);
    transform-origin: left
  }
  to {
    opacity: 1;
    transform: scaleX(1)
  }
}

@keyframes miniCard {
  from {
    opacity: 0;
    transform: translateY(12px) scale(.94)
  }
  to {
    opacity: 1;
    transform: none
  }
}

@keyframes tourBar {
  from {
    transform: scaleY(0);
    opacity: .2
  }
  to {
    transform: scaleY(1);
    opacity: 1
  }
}

@keyframes badgePop {
  from {
    opacity: 0;
    transform: scale(.45) rotate(-20deg)
  }
  70% {
    transform: scale(1.08) rotate(4deg)
  }
  to {
    opacity: 1;
    transform: none
  }
}

@media (max-width: 900px) {
  .onboarding__stage {
    grid-template-columns:76px minmax(0, 1fr)
  }

  .onboarding__steps {
    padding: 18px 10px
  }

  .onboarding__steps button {
    grid-template-columns:1fr;
    padding: 7px
  }

  .onboarding__steps button > div {
    display: none
  }

  .onboarding__steps button > span {
    margin: auto
  }

  .tour-slide {
    grid-template-columns:1fr
  }

  .tour-slide__copy {
    text-align: center
  }

  .tour-slide p, .tour-slide h1 {
    margin-left: auto;
    margin-right: auto
  }

  .tour-slide ul {
    justify-content: center
  }

  .tour-slide li {
    justify-content: center
  }

  .tour-slide__route {
    justify-content: center
  }

  .tour-visual {
    display: none
  }
}

@media (max-width: 560px) {
  .learning-prompt__card {
    padding: 30px 20px 24px;
  }

  .learning-prompt__actions {
    grid-template-columns: 1fr;
  }

  .learning-prompt__meta {
    flex-wrap: wrap;
    justify-content: center;
  }

  .onboarding__header {
    min-height: 62px;
    padding: 11px 14px
  }

  .onboarding__stage {
    display: block
  }

  .onboarding__steps {
    position: absolute;
    right: 12px;
    bottom: 78px;
    left: 12px;
    z-index: 4;
    display: flex;
    justify-content: center;
    overflow: visible;
    border: 0;
    padding: 0;
    background: transparent;
    backdrop-filter: none
  }

  .onboarding__steps button {
    display: none
  }

  .onboarding__content {
    padding: 26px 20px 100px
  }

  .tour-slide {
    display: block
  }

  .tour-slide h1 {
    font-size: 42px
  }

  .tour-slide p {
    font-size: 13px
  }

  .onboarding__footer {
    grid-template-columns:auto 1fr auto;
    gap: 8px;
    min-height: 72px;
    padding: 10px 12px
  }

  .onboarding__dots {
    justify-self: center;
    max-width: 100px;
    overflow: hidden
  }

  .tour-button {
    min-height: 38px;
    padding: 0 12px
  }

  .tour-button--primary {
    max-width: 165px
  }

  .tour-button--ghost {
    font-size: 0
  }

  .tour-button--ghost svg {
    font-size: 15px
  }
}

@media (prefers-reduced-motion: reduce) {
  .learning-prompt__card,
  .learning-prompt__card::before,
  .learning-prompt__orb,
  .onboarding-prompt-enter-active,
  .onboarding-prompt-leave-active,
  .onboarding, .onboarding::before, .onboarding__ambient i, .tour-visual::before, .tour-visual::after, .tour-visual__window, .tour-visual__icon, .tour-visual__lines i, .tour-visual__cards i, .tour-visual__chart i, .tour-visual__badge, .onboarding-shell-enter-active, .onboarding-shell-leave-active {
    animation: none
  }

  .tour-next-enter-active, .tour-next-leave-active, .tour-prev-enter-active, .tour-prev-leave-active {
    transition: none
  }
}
</style>
