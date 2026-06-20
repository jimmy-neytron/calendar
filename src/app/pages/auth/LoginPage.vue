<template>
  <main class="login-page">
    <section class="login-card panel">
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

    </section>
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

const form = reactive({
  name: '',
  email: '',
  password: '',
})

async function submit() {
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
  router.push(route.query.redirect || { name: 'calendar' })
}
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
  width: min(520px, 100%);
  display: grid;
  gap: 14px;
  padding: 18px;
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
</style>
