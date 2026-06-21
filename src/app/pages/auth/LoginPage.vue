<template>
  <main class="login-page">
    <section
      v-if="authStage !== 'success'"
      class="login-card panel"
      :class="{ 'login-card--vortex': authStage === 'vortex' }"
    >
      <div class="login-card__vortex" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div class="login-card__content">
      <div class="login-card__brand">
        <span>✦</span>
        <div>
          <p>Синхронизация через Supabase</p>
          <h1>Семейный календарь</h1>
        </div>
      </div>

      <div class="login-card__tabs">
        <button :class="{ active: mode === 'login' }" type="button" @click="mode = 'login'">Войти</button>
        <button :class="{ active: mode === 'register' }" type="button" @click="mode = 'register'">Создать аккаунт</button>
      </div>

      <form class="login-card__form" @submit.prevent="submit">
        <UiInput
          v-if="mode === 'register'"
          v-model="form.name"
          label="Имя"
          placeholder="Например, Аня"
          required
        />
        <UiInput v-model="form.email" label="Email" placeholder="anya@example.com" required />
        <UiInput v-model="form.password" label="Пароль" type="password" placeholder="Минимум 6 символов" required />

        <p v-if="message" class="login-card__message" :class="{ error: hasError }">{{ message }}</p>

        <UiButton type="submit" icon="→" :loading="authStore.loading.value">
          {{ mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт' }}
        </UiButton>
      </form>
      </div>
    </section>

    <div v-else class="login-success" role="status" aria-label="Авторизация выполнена">
      <span class="login-success__orbit" />
      <span class="login-success__mark">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12 4.2 4.2L19 6.5" />
        </svg>
      </span>
      <strong>Готово</strong>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '../../components/ui/UiButton.vue'
import UiInput from '../../components/ui/UiInput.vue'
import { authStore } from '../../stores/auth.store.js'
import { workspaceStore } from '../../stores/workspace.store.js'

const router = useRouter()
const route = useRoute()
const mode = ref('login')
const message = ref('')
const hasError = ref(false)
const authStage = ref('idle')

const form = reactive({
  name: '',
  email: '',
  password: '',
})

async function submit() {
  if (authStage.value !== 'idle') return
  message.value = ''
  hasError.value = false

  let result
  try {
    result = mode.value === 'login'
      ? await authStore.login(form.email, form.password)
      : await authStore.register(form)
  } catch (error) {
    result = { ok: false, message: error.message || 'Не удалось связаться с сервером' }
  }

  hasError.value = !result.ok
  message.value = result.needsEmailConfirmation
    ? 'Проверь почту и подтверди регистрацию'
    : result.ok
    ? mode.value === 'login' ? 'Вход выполнен' : 'Аккаунт создан'
    : result.message

  if (!result.ok || result.needsEmailConfirmation) return
  const workspace = await workspaceStore.ensureActiveWorkspace()
  if (!workspace) {
    hasError.value = true
    message.value = workspaceStore.error.value || 'Не удалось подготовить пространство'
    return
  }
  await playSuccessAnimation()
  router.push(route.query.redirect || { name: 'calendar' })
}

async function playSuccessAnimation() {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  authStage.value = 'vortex'
  await wait(reducedMotion ? 40 : 620)
  authStage.value = 'success'
  await wait(reducedMotion ? 80 : 720)
}

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration))
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--bg-primary);
}

.login-card {
  position: relative;
  width: min(520px, 100%);
  display: grid;
  gap: 14px;
  padding: 18px;
  overflow: hidden;
  transform-origin: center;
}

.login-card__content {
  display: grid;
  gap: 14px;
}

.login-card__vortex {
  position: absolute;
  z-index: 4;
  inset: 50% auto auto 50%;
  width: 74px;
  height: 74px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.login-card__vortex i {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: var(--accent-hover);
  border-radius: 50%;
}

.login-card__vortex i:nth-child(2) {
  inset: 9px;
  border-top-color: var(--info);
  transform: rotate(120deg);
}

.login-card__vortex i:nth-child(3) {
  inset: 19px;
  border-top-color: var(--pink);
  transform: rotate(240deg);
}

.login-card--vortex {
  animation: authCardCollapse .62s cubic-bezier(.7, 0, .2, 1) both;
}

.login-card--vortex .login-card__content {
  animation: authContentVanish .38s ease-in both;
}

.login-card--vortex .login-card__vortex {
  animation: authVortexAppear .62s cubic-bezier(.2, .8, .2, 1) both;
}

.login-card--vortex .login-card__vortex i:first-child { animation: authSpin .48s linear infinite; }
.login-card--vortex .login-card__vortex i:nth-child(2) { animation: authSpinReverse .38s linear infinite; }
.login-card--vortex .login-card__vortex i:nth-child(3) { animation: authSpin .3s linear infinite; }

.login-success {
  position: relative;
  display: grid;
  place-items: center;
  gap: 12px;
  color: var(--text-primary);
  animation: authSuccessEnter .34s cubic-bezier(.34, 1.56, .64, 1) both;
}

.login-success__orbit {
  position: absolute;
  top: 25px;
  width: 92px;
  height: 92px;
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
  border-radius: 50%;
  animation: authSuccessOrbit .72s var(--ease-out) both;
}

.login-success__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 1px solid color-mix(in srgb, var(--success) 42%, var(--border-color));
  border-radius: 50%;
  color: #fff;
  background:
    radial-gradient(circle at 35% 25%, color-mix(in srgb, #fff 20%, transparent), transparent 35%),
    var(--success);
  box-shadow: 0 18px 55px color-mix(in srgb, var(--success) 26%, transparent);
  animation: authSuccessPulse .64s cubic-bezier(.22, 1, .36, 1) both;
}

.login-success__mark svg {
  width: 40px;
  height: 40px;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-success__mark path {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: authCheckDraw .34s .12s var(--ease-out) forwards;
}

.login-success strong {
  font-size: 13px;
  letter-spacing: .08em;
  text-transform: uppercase;
  animation: authSuccessText .3s .18s both;
}

@keyframes authContentVanish {
  to { opacity: 0; transform: scale(.82); filter: blur(5px); }
}

@keyframes authCardCollapse {
  0% { opacity: 1; transform: scale(1) rotate(0); border-radius: var(--radius-xl); }
  55% { opacity: .92; transform: scale(.72) rotate(-3deg); border-radius: 32px; }
  100% { opacity: 0; transform: scale(.16) rotate(220deg); border-radius: 50%; }
}

@keyframes authVortexAppear {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.35); }
  30%, 78% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(.9); }
}

@keyframes authSpin { to { transform: rotate(360deg); } }
@keyframes authSpinReverse { to { transform: rotate(-360deg); } }
@keyframes authSuccessEnter {
  from { opacity: 0; transform: scale(.55) rotate(-12deg); }
  to { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes authSuccessPulse {
  0% { transform: scale(.72); }
  55% { transform: scale(1.13); }
  78% { transform: scale(.96); }
  100% { transform: scale(1); }
}
@keyframes authSuccessOrbit {
  0% { opacity: .7; transform: scale(.35); }
  100% { opacity: 0; transform: scale(1.45); }
}
@keyframes authCheckDraw { to { stroke-dashoffset: 0; } }
@keyframes authSuccessText {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-card__brand {
  display: flex;
  gap: 10px;
  align-items: center;
}

.login-card__brand > span {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-hover);
}

.login-card__brand p {
  margin-bottom: 2px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-card__brand h1 {
  margin: 0;
}

.login-card__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 3px;
  background: var(--control-bg);
}

.login-card__tabs button {
  min-height: 30px;
  border: 0;
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  background: transparent;
  font-weight: 700;
}

.login-card__tabs button.active {
  color: var(--text-inverse);
  background: var(--accent);
}

.login-card__form,
.login-card__demo {
  display: grid;
  gap: 8px;
}

.login-card__message {
  margin: 0;
  color: var(--success);
}

.login-card__message.error {
  color: var(--danger);
}

.login-card__demo {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.login-card__demo p {
  margin-bottom: 0;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-card__demo button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 5px 8px;
  color: var(--text-primary);
  background: var(--control-bg);
  text-align: left;
}

.login-card__demo button:hover {
  border-color: var(--border-strong);
  background: var(--control-bg-hover);
}

.login-card__demo span {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: var(--avatar-text);
  font-size: 11px;
  font-weight: 800;
}

.login-card__demo small {
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .login-card--vortex,
  .login-card--vortex .login-card__content,
  .login-card--vortex .login-card__vortex,
  .login-card--vortex .login-card__vortex i,
  .login-success,
  .login-success__mark,
  .login-success__orbit,
  .login-success__mark path,
  .login-success strong {
    animation-duration: .01ms !important;
    animation-delay: 0ms !important;
  }
}
</style>
