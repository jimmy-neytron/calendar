<template>
  <section class="integrations-page">
    <template v-if="isHub">
      <header class="integrations-hero">
        <div>
          <span>Интеграции</span>
          <h1>Интеграции</h1>
          <p>Подключайте сервисы, которые помогают вести день без лишних переходов.</p>
        </div>
      </header>

      <section class="integration-hub">
        <button
          v-for="item in integrationCards"
          :key="item.id"
          class="integration-card"
          :class="{ 'is-paused': item.paused }"
          type="button"
          @click="openIntegration(item.id)"
        >
          <div class="integration-card__glow" aria-hidden="true" />
          <header>
            <span class="integration-card__icon integration-card__icon--image">
              <img :src="item.image" :alt="item.name">
            </span>
            <b :class="{ on: item.connected, paused: item.paused }">{{ item.status }}</b>
          </header>
          <div class="integration-card__copy">
            <small>{{ item.kicker }}</small>
            <h2>{{ item.name }}</h2>
            <p>{{ item.description }}</p>
          </div>
          <footer>
            <span>{{ item.meta }}</span>
            <i><UiIcon :name="item.paused ? 'star' : 'right'" /></i>
          </footer>
        </button>
      </section>
    </template>

    <template v-else-if="activeIntegrationId === 'telegram'">
      <header class="planera-hero">
        <div class="planera-hero__mesh" aria-hidden="true" />
        <div class="planera-hero__copy">
          <RouterLink class="back-link" :to="{ name: 'integrations' }">
            <UiIcon name="left" /> Интеграции
          </RouterLink>
          <div class="planera-hero__title">
            <span class="planera-mark"><UiIcon name="mail" /></span>
            <div>
              <small>Telegram</small>
              <h1>Planera Daily</h1>
              <p>Ежедневная сводка событий календаря и спорта в Telegram в 08:00.</p>
            </div>
          </div>
        </div>
        <figure class="planera-cover" aria-hidden="true">
          <img src="/images/integrations/planera-daily-cover.png" alt="">
        </figure>
      </header>

      <section class="planera-metrics">
        <article>
          <span>Статус</span>
          <strong>{{ planeraStatusLabel }}</strong>
          <small>{{ planeraStatusHint }}</small>
        </article>
        <article>
          <span>Рассылка</span>
          <strong>{{ effectiveDigestEnabled ? 'Включена' : 'Выключена' }}</strong>
          <small>{{ isPlaneraPaused ? 'Приостановлена тарифом' : 'Каждый день в 08:00 по Москве' }}</small>
        </article>
        <article>
          <span>Тариф</span>
          <strong>{{ isPro ? 'Pro' : currentPlan.name }}</strong>
          <small>{{ isPro ? 'Интеграция доступна' : 'Нужен тариф Pro' }}</small>
        </article>
      </section>

      <section class="planera-grid">
        <article class="planera-control">
          <header>
            <div>
              <span>Управление</span>
              <h2>Подключение</h2>
            </div>
            <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadTelegram">
              Обновить
            </UiButton>
          </header>

          <div class="planera-control__status" :class="{ active: isConnected && !isPlaneraPaused, paused: isPlaneraPaused }">
            <span><UiIcon :name="isPlaneraPaused ? 'star' : (isConnected ? 'check' : 'link')" /></span>
            <div>
              <strong>{{ planeraStatusLabel }}</strong>
              <small>{{ planeraStatusHint }}</small>
            </div>
          </div>

          <div v-if="isPlaneraPaused" class="planera-paused">
            <UiIcon name="star" />
            <div>
              <strong>Planera Daily на паузе</strong>
              <span>Интеграция сохранена, но ежедневная отправка недоступна, пока тариф не вернется на Pro.</span>
            </div>
          </div>

          <template v-else>
            <div v-if="linkCode" class="telegram-link-box">
              <div>
                <small>Код подключения</small>
                <strong>{{ linkCode }}</strong>
                <span>Действует до {{ formatDate(linkCodeExpiresAt) }}</span>
              </div>
              <div class="telegram-link-box__actions">
                <UiButton v-if="telegramDeepLink" icon="link" @click="openTelegram">
                  Открыть бота
                </UiButton>
                <UiButton variant="secondary" icon="copy" @click="copyStartCommand">
                  Скопировать команду
                </UiButton>
              </div>
            </div>

            <div class="integration-actions">
              <UiButton
                v-if="!isConnected"
                icon="link"
                :loading="isGeneratingCode"
                @click="generateLinkCode"
              >
                Подключить Telegram
              </UiButton>

              <label v-if="isConnected" class="digest-toggle">
                <span>
                  <strong>Присылать сводку каждый день</strong>
                  <small>Можно выключить, не удаляя привязку бота.</small>
                </span>
                <UiToggle
                  :model-value="digestEnabled"
                  :disabled="isSaving"
                  label="Ежедневная сводка"
                  @update:model-value="toggleDigest"
                />
              </label>

              <UiButton
                v-if="isConnected"
                variant="danger"
                icon="trash"
                :loading="isDisconnecting"
                @click="disconnect"
              >
                Отключить
              </UiButton>
            </div>
          </template>
        </article>

        <article class="planera-info">
          <header>
            <span>Сводка</span>
            <h2>Что входит</h2>
          </header>
          <div class="feature-list">
            <div v-for="feature in digestFeatures" :key="feature.title">
              <UiIcon :name="feature.icon" />
              <span>
                <strong>{{ feature.title }}</strong>
                <small>{{ feature.description }}</small>
              </span>
            </div>
          </div>
        </article>
      </section>
    </template>

    <UiModal
      v-model="isUnavailableModalOpen"
      title="Planera Daily недоступна"
      eyebrow="Тариф Pro"
      width="460px"
    >
      <div class="unavailable-modal">
        <span><UiIcon name="star" /></span>
        <p>
          Интеграция Planera Daily доступна на тарифе Pro. Если бот уже был подключен,
          отправка сводок будет приостановлена и автоматически снова станет доступна после возврата Pro.
        </p>
        <UiButton @click="isUnavailableModalOpen = false">Понятно</UiButton>
      </div>
    </UiModal>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiToggle from '../../../components/ui/UiToggle.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { useSubscriptionSettings } from '../../../composables/preferences/useSubscriptionSettings.js'
import { integrationsApi } from '../api/integrations.api.js'

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''

const route = useRoute()
const router = useRouter()
const { currentTier, currentPlan } = useSubscriptionSettings()
const { notify } = useNotification()
const integration = ref(null)
const linkCode = ref('')
const linkCodeExpiresAt = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const isGeneratingCode = ref(false)
const isDisconnecting = ref(false)
const isUnavailableModalOpen = ref(false)

const activeIntegrationId = computed(() => String(route.params.integrationId || ''))
const isHub = computed(() => !activeIntegrationId.value)
const isPro = computed(() => currentTier.value === 'pro')
const isConnected = computed(() => integration.value?.connected === true)
const digestEnabled = computed(() => integration.value?.dailyDigestEnabled === true)
const effectiveDigestEnabled = computed(() => isPro.value && digestEnabled.value)
const isPlaneraPaused = computed(() => !isPro.value)
const planeraStatusLabel = computed(() => {
  if (isPlaneraPaused.value) return 'На паузе'
  if (!isConnected.value) return 'Не подключено'
  return integration.value?.telegramUsername ? `@${integration.value.telegramUsername}` : 'Бот привязан'
})
const planeraStatusHint = computed(() => {
  if (isPlaneraPaused.value) return 'Верните Pro, чтобы снова включить отправку'
  return isConnected.value ? 'Бот привязан к аккаунту' : 'Нужно подключить бота'
})
const telegramDeepLink = computed(() => (
  TELEGRAM_BOT_USERNAME && linkCode.value
    ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(linkCode.value)}`
    : ''
))
const integrationCards = computed(() => [
  {
    id: 'telegram',
    name: 'Planera Daily',
    kicker: 'Telegram',
    description: 'Утренняя сводка с календарем и спортом прямо в Telegram.',
    icon: 'mail',
    connected: isConnected.value && isPro.value,
    paused: isPlaneraPaused.value,
    status: isPlaneraPaused.value ? 'Pro' : (isConnected.value ? 'Подключено' : 'Настроить'),
    meta: isPlaneraPaused.value ? 'Доступно на Pro' : '08:00 по Москве',
    image: '/images/integrations/planera-daily-icon.png',
  },
])
const digestFeatures = [
  {
    icon: 'calendar',
    title: 'События дня',
    description: 'События на сегодня из ваших пространств.',
  },
  {
    icon: 'sport',
    title: 'Спорт',
    description: 'Упражнения, назначенные на текущий день недели.',
  },
  {
    icon: 'clock',
    title: '08:00',
    description: 'Автоматическая отправка по московскому времени.',
  },
]

function openIntegration(id) {
  if (id === 'telegram' && !isPro.value) {
    isUnavailableModalOpen.value = true
    return
  }
  router.push({ name: 'integration-detail', params: { integrationId: id } })
}

async function loadTelegram() {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const { data, error } = await integrationsApi.getTelegramIntegration()
    if (error) {
      notify(error.message || 'Не удалось загрузить интеграцию', 'danger')
      return
    }
    integration.value = data || null
  } catch (error) {
    notify(error.message || 'Не удалось загрузить интеграцию', 'danger')
  } finally {
    isLoading.value = false
  }
}

async function generateLinkCode() {
  if (isGeneratingCode.value) return
  isGeneratingCode.value = true
  try {
    const { data, error } = await integrationsApi.createTelegramLinkCode()
    if (error) {
      notify(error.message || 'Не удалось создать код подключения', 'danger')
      return
    }
    linkCode.value = data?.code || ''
    linkCodeExpiresAt.value = data?.expiresAt || ''
    notify('Код подключения создан', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось создать код подключения', 'danger')
  } finally {
    isGeneratingCode.value = false
  }
}

async function toggleDigest(enabled) {
  if (isSaving.value || isPlaneraPaused.value) return
  isSaving.value = true
  try {
    const { data, error } = await integrationsApi.setTelegramDigestEnabled(enabled)
    if (error) {
      notify(error.message || 'Не удалось сохранить настройку', 'danger')
      return
    }
    integration.value = data
    notify(enabled ? 'Сводка включена' : 'Сводка выключена', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось сохранить настройку', 'danger')
  } finally {
    isSaving.value = false
  }
}

async function disconnect() {
  if (isDisconnecting.value) return
  isDisconnecting.value = true
  try {
    const { data, error } = await integrationsApi.disconnectTelegram()
    if (error) {
      notify(error.message || 'Не удалось отключить Telegram', 'danger')
      return
    }
    integration.value = data
    linkCode.value = ''
    linkCodeExpiresAt.value = ''
    notify('Telegram отключен', 'success')
  } catch (error) {
    notify(error.message || 'Не удалось отключить Telegram', 'danger')
  } finally {
    isDisconnecting.value = false
  }
}

function openTelegram() {
  if (!telegramDeepLink.value) {
    copyStartCommand()
    notify('Укажите VITE_TELEGRAM_BOT_USERNAME, чтобы открывать бота по кнопке', 'info')
    return
  }
  window.open(telegramDeepLink.value, '_blank', 'noopener,noreferrer')
}

async function copyStartCommand() {
  if (!linkCode.value) return
  await navigator.clipboard?.writeText(`/start ${linkCode.value}`)
  notify('Команда скопирована', 'success')
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

onMounted(loadTelegram)
</script>

<style scoped>
.integrations-page{display:grid;gap:14px;width:min(100%,1120px);margin:0 auto;animation:fadeSlideUp .42s var(--ease-out)}.integrations-hero,.integration-card,.planera-hero,.planera-control,.planera-info,.planera-metrics article{border:1px solid var(--border-color);border-radius:18px;background:var(--panel-bg);box-shadow:var(--shadow-sm)}.integrations-hero{padding:22px 24px;background:radial-gradient(circle at 96% 0,color-mix(in srgb,#2dd4bf 10%,transparent),transparent 240px),var(--panel-bg)}.integrations-hero span,.integration-card small,.planera-hero small,.planera-control header span,.planera-info header span,.planera-metrics span,.telegram-link-box small{color:#2dd4bf;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.integrations-hero h1{margin:5px 0 7px;font-size:clamp(26px,3vw,38px);line-height:1.05}.integrations-hero p{max-width:560px;margin:0;color:var(--text-secondary);line-height:1.55}.integration-hub{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,280px));gap:12px;align-items:stretch}.integration-card{position:relative;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:18px;min-height:172px;overflow:hidden;padding:14px;color:var(--text-primary);text-align:left;background:linear-gradient(145deg,color-mix(in srgb,#2dd4bf 7%,var(--panel-bg)),var(--panel-bg));transition:.18s var(--ease-out)}.integration-card__glow{position:absolute;right:-58px;top:-72px;width:160px;height:160px;border-radius:54px;background:linear-gradient(135deg,color-mix(in srgb,#38bdf8 38%,transparent),color-mix(in srgb,#34d399 26%,transparent));filter:blur(26px);transform:rotate(12deg);pointer-events:none}.integration-card header,.integration-card footer,.integration-card__copy{position:relative;z-index:1}.integration-card header,.integration-card footer{display:flex;align-items:center;justify-content:space-between;gap:10px}.integration-card__icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#2dd4bf;background:color-mix(in srgb,#2dd4bf 12%,var(--control-bg));font-size:20px;overflow:hidden}.integration-card__icon--image{border:1px solid color-mix(in srgb,#2dd4bf 22%,var(--border-color));background:#178ff5}.integration-card__icon img{width:100%;height:100%;object-fit:cover}.integration-card b{border:1px solid var(--border-color);border-radius:999px;padding:5px 8px;color:var(--text-muted);background:color-mix(in srgb,var(--control-bg) 82%,transparent);font-size:9px}.integration-card b.on{color:var(--success);border-color:color-mix(in srgb,var(--success) 34%,var(--border-color));background:color-mix(in srgb,var(--success) 8%,var(--control-bg))}.integration-card b.paused{color:var(--warning);border-color:color-mix(in srgb,var(--warning) 34%,var(--border-color));background:color-mix(in srgb,var(--warning) 8%,var(--control-bg))}.integration-card h2{margin:4px 0 6px;font-size:20px;line-height:1.1}.integration-card p{margin:0;color:var(--text-secondary);font-size:11px;line-height:1.45}.integration-card footer{align-self:end;color:var(--text-muted);font-size:10px}.integration-card footer i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;color:var(--text-inverse);background:#2dd4bf;font-style:normal}.integration-card:hover{border-color:color-mix(in srgb,#2dd4bf 42%,var(--border-color));box-shadow:var(--shadow-md);transform:translateY(-2px)}.integration-card.is-paused:hover{border-color:color-mix(in srgb,var(--warning) 42%,var(--border-color))}.planera-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,420px);gap:20px;overflow:hidden;padding:22px 24px;background:radial-gradient(circle at 88% 18%,color-mix(in srgb,#2dd4bf 20%,transparent),transparent 270px),var(--panel-bg)}.planera-hero__mesh{position:absolute;inset:-80px -70px auto auto;width:300px;height:300px;border-radius:80px;background:linear-gradient(135deg,color-mix(in srgb,#38bdf8 36%,transparent),color-mix(in srgb,#34d399 24%,transparent));filter:blur(34px);transform:rotate(10deg);pointer-events:none}.planera-hero__copy{position:relative;z-index:1;display:grid;gap:16px}.back-link{display:flex;align-items:center;gap:5px;width:max-content;color:var(--text-muted);font-size:10px;text-decoration:none}.planera-hero__title{display:flex;align-items:center;gap:13px}.planera-mark{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;color:#2dd4bf;background:color-mix(in srgb,#2dd4bf 12%,var(--control-bg));font-size:24px}.planera-hero h1{margin:3px 0 0}.planera-hero p{max-width:560px;margin:6px 0 0;color:var(--text-secondary);line-height:1.55}.planera-cover{position:relative;z-index:1;align-self:stretch;min-height:190px;margin:0;overflow:hidden;border:1px solid color-mix(in srgb,#2dd4bf 24%,var(--border-color));border-radius:20px;background:var(--control-bg);box-shadow:var(--shadow-md)}.planera-cover img{width:100%;height:100%;object-fit:cover;object-position:center}.planera-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.planera-metrics article{display:grid;gap:3px;padding:15px 16px;background:var(--card-bg)}.planera-metrics strong{overflow:hidden;font-size:20px;text-overflow:ellipsis;white-space:nowrap}.planera-metrics small{color:var(--text-muted);font-size:10px}.planera-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:12px}.planera-control,.planera-info{display:grid;gap:14px;padding:16px}.planera-control{position:relative;overflow:hidden;background:radial-gradient(circle at 96% 0,color-mix(in srgb,#2dd4bf 10%,transparent),transparent 170px),var(--panel-bg)}.planera-control>header{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-color);padding-bottom:12px}.planera-control h2,.planera-info h2{margin:3px 0 0}.planera-control__status{position:relative;z-index:1;display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:11px;border:1px solid var(--border-color);border-radius:15px;padding:12px;background:linear-gradient(135deg,color-mix(in srgb,#2dd4bf 7%,var(--control-bg)),var(--control-bg))}.planera-control__status>span{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#2dd4bf;background:color-mix(in srgb,#2dd4bf 12%,var(--card-soft));font-size:19px}.planera-control__status strong,.planera-control__status small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.planera-control__status small{margin-top:3px;color:var(--text-muted);font-size:10px}.planera-control__status.active{border-color:color-mix(in srgb,var(--success) 30%,var(--border-color));background:linear-gradient(135deg,color-mix(in srgb,var(--success) 8%,var(--control-bg)),var(--control-bg))}.planera-control__status.active>span{color:var(--success);background:color-mix(in srgb,var(--success) 11%,var(--card-soft))}.planera-control__status.paused{border-color:color-mix(in srgb,var(--warning) 30%,var(--border-color));background:linear-gradient(135deg,color-mix(in srgb,var(--warning) 8%,var(--control-bg)),var(--control-bg))}.planera-control__status.paused>span{color:var(--warning);background:color-mix(in srgb,var(--warning) 11%,var(--card-soft))}.planera-paused{display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:10px;border:1px solid color-mix(in srgb,var(--warning) 28%,var(--border-color));border-radius:12px;padding:12px;background:color-mix(in srgb,var(--warning) 7%,var(--control-bg))}.planera-paused svg{color:var(--warning);font-size:22px}.planera-paused span,.digest-toggle small,.telegram-link-box span{margin:0;color:var(--text-secondary);line-height:1.5}.telegram-link-box{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid color-mix(in srgb,#2dd4bf 22%,var(--border-color));border-radius:14px;padding:13px;background:color-mix(in srgb,#2dd4bf 6%,var(--control-bg))}.telegram-link-box strong{display:block;margin-top:3px;font-size:24px;letter-spacing:.06em}.telegram-link-box__actions,.integration-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.integration-actions{border-top:1px solid var(--border-color);padding-top:12px}.digest-toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:min(100%,470px);border:1px solid var(--border-color);border-radius:14px;padding:12px 13px;background:var(--control-bg)}.digest-toggle strong,.digest-toggle small{display:block}.feature-list{display:grid;gap:8px}.feature-list div{display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:14px;padding:11px;background:var(--control-bg)}.feature-list svg{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#2dd4bf;background:color-mix(in srgb,#2dd4bf 10%,var(--card-soft));padding:9px}.feature-list strong,.feature-list small{display:block}.feature-list small{margin-top:3px;color:var(--text-muted);font-size:10px;line-height:1.45}.unavailable-modal{display:grid;justify-items:center;gap:12px;text-align:center}.unavailable-modal>span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:var(--warning);background:color-mix(in srgb,var(--warning) 10%,var(--control-bg));font-size:24px}.unavailable-modal p{margin:0;color:var(--text-secondary);line-height:1.6}@media(max-width:900px){.planera-grid,.planera-hero{grid-template-columns:1fr}.planera-cover{max-width:520px}}@media(max-width:720px){.integration-hub{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}.planera-metrics{grid-template-columns:1fr}.planera-hero{padding:18px}.planera-hero__title{align-items:flex-start}.planera-control>header,.telegram-link-box{display:grid}.digest-toggle{align-items:flex-start}.integrations-hero h1{font-size:32px}}
</style>
