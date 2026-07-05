<template>
  <section class="admin-modals-page">
    <header class="admin-section-hero">
      <div>
        <span>Модальные окна</span>
        <h1>Конструктор сообщений</h1>
        <p>Собирай модалку из зон, редактируй части в боковой панели и включай одну активную для всех пользователей.</p>
      </div>
      <div class="admin-hero-actions">
        <UiButton icon="refresh" variant="secondary" :loading="isLoading" @click="loadModals">Обновить</UiButton>
        <UiButton icon="＋" @click="createModal">Новая модалка</UiButton>
      </div>
    </header>

    <div class="admin-modals-layout">
      <aside class="admin-modal-list panel">
        <button
          v-for="modal in modals"
          :key="modal.id"
          type="button"
          :class="{ active: selectedModal?.id === modal.id }"
          @click="selectModal(modal)"
        >
          <span>
            <strong>{{ modal.title || 'Без названия' }}</strong>
            <small>{{ modal.isActive ? 'Активна' : 'Выключена' }}</small>
          </span>
          <i :class="{ on: modal.isActive }" />
        </button>

        <div v-if="!modals.length && !isLoading" class="admin-empty">
          <UiIcon name="grid" />
          <strong>Модалок пока нет</strong>
        </div>
      </aside>

      <section class="modal-builder panel">
        <div v-if="isLoading" class="admin-state">
          <span><UiIcon name="refresh" /></span>
          <strong>Загружаем модалки</strong>
        </div>

        <div v-else-if="errorMessage" class="admin-state admin-state--danger">
          <span><UiIcon name="warning" /></span>
          <strong>{{ errorMessage }}</strong>
        </div>

        <template v-else>
          <header class="modal-builder__bar">
            <div class="modal-builder__actions">
              <UiButton v-if="form.id" variant="danger" :disabled="isSaving" @click="deleteCurrentModal">Удалить</UiButton>
              <UiButton :loading="isSaving" @click="saveCurrentModal">Сохранить</UiButton>
            </div>
          </header>

          <section class="modal-settings-panel">
            <article class="modal-setting-card">
              <div>
                <small>Статус</small>
                <strong>{{ form.isActive ? 'Активна' : 'Выключена' }}</strong>
              </div>
              <UiToggle v-model="form.isActive" label="Активность модалки" />
            </article>

            <article class="modal-setting-card">
              <label class="modal-field">
                <span>Показ</span>
                <UiSelect v-model="form.displayMode" compact aria-label="Режим показа модалки">
                  <option value="always">Всегда после загрузки</option>
                  <option value="once">Скрывать после закрытия</option>
                </UiSelect>
              </label>
            </article>

            <article class="modal-setting-card">
              <label class="modal-field">
                <span>Стиль</span>
                <UiSelect v-model="form.modalType" compact aria-label="Стиль модального окна">
                  <option value="notice">Уведомление</option>
                  <option value="warning">Предупреждение</option>
                  <option value="danger">Критично</option>
                  <option value="success">Успех</option>
                  <option value="maintenance">Техработы</option>
                </UiSelect>
              </label>
            </article>

            <article class="modal-setting-card">
              <div>
                <small>Закрытие</small>
                <strong>{{ form.isBlocking ? 'Нельзя закрыть' : 'Можно закрыть' }}</strong>
              </div>
              <UiToggle v-model="form.isBlocking" label="Запретить закрытие модалки" />
            </article>

            <article class="modal-setting-card modal-setting-card--audience">
              <header>
                <div>
                  <small>Аудитория</small>
                  <strong>{{ audienceSummary.title }}</strong>
                  <span>{{ audienceSummary.details }}</span>
                </div>
              </header>

              <div class="modal-audience-mode" role="radiogroup" aria-label="Кому показывать модалку">
                <label :class="{ active: form.audienceMode === 'all' }">
                  <input v-model="form.audienceMode" type="radio" value="all" />
                  <span>
                    <strong>Всем</strong>
                    <small>Показывать всем пользователям приложения</small>
                  </span>
                </label>
                <label :class="{ active: form.audienceMode === 'targeted' }">
                  <input v-model="form.audienceMode" type="radio" value="targeted" />
                  <span>
                    <strong>Выборочно</strong>
                    <small>UUID, email, роли или тарифы</small>
                  </span>
                </label>
              </div>

              <div v-if="form.audienceMode === 'targeted'" class="modal-audience-targets">
                <div class="modal-audience-targets__inputs">
                  <UiInput
                    v-model="form.targetUserIdsText"
                    type="textarea"
                    label="UUID или список UUID"
                    placeholder="8fb2c762-134b-4986-ace7-52305674e03d"
                  />
                  <UiInput
                    v-model="form.targetEmailsText"
                    type="textarea"
                    label="Email или список email"
                    placeholder="user@example.com"
                  />
                </div>

                <div class="modal-audience-pickers">
                  <label class="modal-field">
                    <span>Добавить роль</span>
                    <UiSelect v-model="form.targetRoleDraft" compact aria-label="Добавить роль в аудиторию" @change="addAudienceRole">
                      <option value="">Выбрать роль</option>
                      <option v-for="role in availableRoleOptions" :key="role.value" :value="role.value">
                        {{ role.label }}
                      </option>
                    </UiSelect>
                  </label>

                  <label class="modal-field">
                    <span>Добавить тариф</span>
                    <UiSelect v-model="form.targetTierDraft" compact aria-label="Добавить тариф в аудиторию" @change="addAudienceTier">
                      <option value="">Выбрать тариф</option>
                      <option v-for="tier in availableTierOptions" :key="tier.value" :value="tier.value">
                        {{ tier.label }}
                      </option>
                    </UiSelect>
                  </label>
                </div>

                <div class="modal-audience-chips">
                  <button v-for="role in selectedRoleLabels" :key="`role-${role.value}`" type="button" @click="removeAudienceRole(role.value)">
                    {{ role.label }}
                    <UiIcon name="close" />
                  </button>
                  <button v-for="tier in selectedTierLabels" :key="`tier-${tier.value}`" type="button" @click="removeAudienceTier(tier.value)">
                    {{ tier.label }}
                    <UiIcon name="close" />
                  </button>
                  <span v-if="!selectedRoleLabels.length && !selectedTierLabels.length">Сегменты не выбраны</span>
                </div>

                <div class="modal-audience-note">
                  <UiIcon name="warning" />
                  <span>UUID/email показывают модалку конкретному пользователю. Роли и тарифы работают как фильтры: если выбран Free, Pro её не увидит.</span>
                </div>
              </div>
            </article>
          </section>

          <div class="modal-canvas">
            <article
              class="modal-shell-preview"
              :class="[`modal-shell-preview--${form.modalType}`, { 'modal-shell-preview--blocking': form.isBlocking }]"
            >
              <div class="modal-preview-badge">
                <UiIcon :name="modalStyle.icon" />
                <span>{{ modalStyle.label }}</span>
              </div>

              <button class="modal-zone modal-zone--title" type="button" @click="openEditor('title')">
                <small>Название</small>
                <strong v-if="form.title">{{ form.title }}</strong>
                <span v-else>Нажми, чтобы добавить название</span>
              </button>

              <button class="modal-zone modal-zone--content" type="button" @click="openEditor('content')">
                <small>Содержимое</small>
                <div v-if="plainContent" class="modal-zone__html" v-html="safePreviewHtml" />
                <span v-else>Нажми, чтобы открыть готовый WYSIWYG-редактор TipTap</span>
              </button>

              <button class="modal-zone modal-zone--buttons" type="button" @click="openEditor('buttons')">
                <small>Кнопки</small>
                <footer v-if="cleanButtons.length">
                  <span v-for="button in cleanButtons" :key="button.key" :class="button.variant">
                    {{ button.label }}
                  </span>
                </footer>
                <span v-else>Нажми, чтобы добавить кнопки-ссылки или кнопку закрытия</span>
              </button>

            </article>
          </div>
        </template>
      </section>
    </div>

    <Teleport to="body">
      <transition name="modal-slide">
        <div v-if="activePanel" class="modal-slide" @mousedown.self="closeEditor">
          <aside class="modal-slide__panel" role="dialog" aria-modal="true" :aria-label="panelTitle">
            <header>
              <div>
                <small>Редактирование</small>
                <strong>{{ panelTitle }}</strong>
              </div>
              <button type="button" aria-label="Закрыть" @click="closeEditor">
                <UiIcon name="close" />
              </button>
            </header>

            <section v-if="activePanel === 'title'" class="modal-slide__body">
              <UiInput v-model="form.title" label="Название модалки" placeholder="Например: Важное обновление" required />
            </section>

            <section v-else-if="activePanel === 'content'" class="modal-slide__body">
              <label class="modal-field">
                <span>Содержимое</span>
                <AdminRichTextEditor v-model="form.contentHtml" />
              </label>
            </section>

            <section v-else-if="activePanel === 'buttons'" class="modal-slide__body">
              <div class="modal-buttons-head">
                <div>
                  <small>Кнопки</small>
                  <strong>Ссылки и закрытие</strong>
                </div>
                <div class="modal-button-actions">
                  <UiButton icon="link" variant="secondary" size="sm" @click="addButton('link')">Ссылка</UiButton>
                  <UiButton icon="close" variant="secondary" size="sm" @click="addButton('close')">Закрыть</UiButton>
                </div>
              </div>

              <article v-for="(button, index) in form.buttons" :key="button.key" class="modal-button-card">
                <div class="modal-button-card__top">
                  <span>Кнопка {{ index + 1 }}</span>
                  <UiButton icon="trash" variant="danger" size="sm" @click="removeButton(index)">Удалить</UiButton>
                </div>

                <UiInput v-model="button.label" label="Текст кнопки" placeholder="Например: Подробнее" />

                <div class="modal-button-card__row">
                  <label class="modal-field">
                    <span>Действие</span>
                    <UiSelect v-model="button.action" aria-label="Действие кнопки" @change="syncButtonAction(button)">
                      <option value="link">Открыть ссылку</option>
                      <option value="close">Закрыть окно</option>
                    </UiSelect>
                  </label>

                  <label class="modal-field">
                    <span>Вид</span>
                    <UiSelect v-model="button.variant" aria-label="Вид кнопки">
                      <option value="primary">Основная</option>
                      <option value="secondary">Вторичная</option>
                    </UiSelect>
                  </label>
                </div>

                <UiInput v-if="button.action === 'link'" v-model="button.url" label="Ссылка" placeholder="https://..." />
                <div v-else class="modal-button-card__hint">Эта кнопка закроет модальное окно.</div>
              </article>

              <div v-if="!form.buttons.length" class="modal-buttons-empty">
                <UiIcon name="link" />
                <strong>Кнопок пока нет</strong>
                <span>Добавь ссылку или кнопку закрытия сверху.</span>
              </div>
            </section>

            <footer>
              <UiButton variant="secondary" @click="closeEditor">Готово</UiButton>
              <UiButton :loading="isSaving" @click="saveCurrentModal">Сохранить</UiButton>
            </footer>
          </aside>
        </div>
      </transition>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminApi } from '../../api/supabase/admin.api.js'
import AdminRichTextEditor from '../../components/admin/AdminRichTextEditor.vue'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'
import UiInput from '../../components/ui/UiInput.vue'
import UiSelect from '../../components/ui/UiSelect.vue'
import UiToggle from '../../components/ui/UiToggle.vue'
import { useNotification } from '../../composables/ui/useNotification.js'

const { notify } = useNotification()
const modals = ref([])
const selectedModal = ref(null)
const activePanel = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const form = reactive({
  id: '',
  title: '',
  contentHtml: '',
  buttons: [],
  isActive: false,
  displayMode: 'always',
  modalType: 'notice',
  isBlocking: false,
  audienceMode: 'all',
  targetUserIdsText: '',
  targetEmailsText: '',
  targetRoles: [],
  targetTiers: [],
  targetRoleDraft: '',
  targetTierDraft: '',
})
const modalStyleMap = {
  notice: { label: 'Уведомление', icon: 'mail' },
  warning: { label: 'Предупреждение', icon: 'warning' },
  danger: { label: 'Критично', icon: 'warning' },
  success: { label: 'Успех', icon: 'check' },
  maintenance: { label: 'Техработы', icon: 'settings' },
}
const roleOptions = [
  { value: 'admin', label: 'Админы' },
  { value: 'user', label: 'Пользователи' },
]
const tierOptions = [
  { value: 'free', label: 'Free' },
  { value: 'plus', label: 'Plus' },
  { value: 'pro', label: 'Pro' },
]
const safePreviewHtml = computed(() => sanitizeHtml(form.contentHtml))
const plainContent = computed(() => stripHtml(form.contentHtml).trim())
const cleanButtons = computed(() => normalizeButtons(form.buttons).filter((button) => (
  button.label && (button.action === 'close' || button.url)
)))
const modalStyle = computed(() => modalStyleMap[form.modalType] || modalStyleMap.notice)
const availableRoleOptions = computed(() => roleOptions.filter((role) => !form.targetRoles.includes(role.value)))
const availableTierOptions = computed(() => tierOptions.filter((tier) => !form.targetTiers.includes(tier.value)))
const selectedRoleLabels = computed(() => roleOptions.filter((role) => form.targetRoles.includes(role.value)))
const selectedTierLabels = computed(() => tierOptions.filter((tier) => form.targetTiers.includes(tier.value)))
const audience = computed(() => buildAudience())
const audienceSummary = computed(() => {
  if (audience.value.mode === 'all') return { title: 'Все пользователи', details: 'Модалка доступна всем, кто загрузил приложение.' }

  const parts = []
  if (audience.value.userIds.length) parts.push(`${audience.value.userIds.length} UUID`)
  if (audience.value.emails.length) parts.push(`${audience.value.emails.length} email`)
  if (audience.value.roles.length) parts.push(`роли: ${audience.value.roles.join(', ')}`)
  if (audience.value.tiers.length) parts.push(`тарифы: ${audience.value.tiers.join(', ')}`)
  return {
    title: 'Выборочно',
    details: parts.length ? parts.join(' · ') : 'Добавь UUID, email, роли или тарифы.',
  }
})
const panelTitle = computed(() => ({
  title: 'Название',
  content: 'Содержимое модалки',
  buttons: 'Кнопки модалки',
  audience: 'Аудитория модалки',
}[activePanel.value] || 'Модалка'))

function openEditor(panel) {
  activePanel.value = panel
}

function closeEditor() {
  activePanel.value = ''
}

function resetModalForm() {
  selectedModal.value = null
  Object.assign(form, {
    id: '',
    title: '',
    contentHtml: '',
    buttons: [],
    isActive: false,
    displayMode: 'always',
    modalType: 'notice',
    isBlocking: false,
    audienceMode: 'all',
    targetUserIdsText: '',
    targetEmailsText: '',
    targetRoles: [],
    targetTiers: [],
    targetRoleDraft: '',
    targetTierDraft: '',
  })
}

function createModal() {
  resetModalForm()
  activePanel.value = 'title'
}

function selectModal(modal) {
  selectedModal.value = modal
  closeEditor()
  Object.assign(form, {
    id: modal.id,
    title: modal.title,
    contentHtml: modal.contentHtml,
    buttons: normalizeButtons(modal.buttons),
    isActive: modal.isActive,
    displayMode: modal.displayMode,
    modalType: modal.modalType,
    isBlocking: modal.isBlocking,
    audienceMode: modal.audience.mode,
    targetUserIdsText: modal.audience.userIds.join('\n'),
    targetEmailsText: modal.audience.emails.join('\n'),
    targetRoles: [...modal.audience.roles],
    targetTiers: [...modal.audience.tiers],
    targetRoleDraft: '',
    targetTierDraft: '',
  })
}

function mapModal(row) {
  return {
    id: row.id,
    title: row.title || '',
    contentHtml: row.content_html || '',
    buttons: normalizeButtons(row.buttons),
    isActive: row.is_active === true,
    displayMode: row.display_mode === 'once' ? 'once' : 'always',
    modalType: normalizeModalType(row.modal_type),
    isBlocking: row.is_blocking === true,
    audience: normalizeAudience(row.audience),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  }
}

function normalizeModalType(value) {
  return Object.prototype.hasOwnProperty.call(modalStyleMap, value) ? value : 'notice'
}

function normalizeAudience(value) {
  const source = value && typeof value === 'object' ? value : {}
  const userIds = normalizeList(source.userIds || source.user_ids)
  const emails = normalizeList(source.emails).map((email) => email.toLowerCase())
  const roles = normalizeList(source.roles).map((role) => role.toLowerCase()).filter((role) => roleOptions.some((option) => option.value === role))
  const tiers = normalizeList(source.tiers).map((tier) => tier.toLowerCase()).filter((tier) => tierOptions.some((option) => option.value === tier))
  const hasCriteria = Boolean(userIds.length || emails.length || roles.length || tiers.length)
  return {
    mode: source.mode === 'targeted' || hasCriteria ? 'targeted' : 'all',
    userIds,
    emails,
    roles,
    tiers,
  }
}

function normalizeButtons(buttons) {
  return (Array.isArray(buttons) ? buttons : []).map((button, index) => ({
    key: button.key || `${Date.now()}-${index}`,
    label: String(button.label || '').slice(0, 80),
    action: button.action === 'close' ? 'close' : 'link',
    url: button.action === 'close' ? '' : normalizeUrl(button.url || ''),
    variant: button.variant === 'secondary' ? 'secondary' : 'primary',
  }))
}

function addButton(action = 'link') {
  const isCloseAction = action === 'close'
  form.buttons.push({
    key: `${Date.now()}`,
    label: isCloseAction ? 'Закрыть' : '',
    action: isCloseAction ? 'close' : 'link',
    url: '',
    variant: form.buttons.length ? 'secondary' : 'primary',
  })
}

function removeButton(index) {
  form.buttons.splice(index, 1)
}

function syncButtonAction(button) {
  if (button.action === 'close') {
    button.url = ''
    if (!button.label.trim()) button.label = 'Закрыть'
  }
}

function addAudienceRole(value) {
  if (value && !form.targetRoles.includes(value)) {
    form.audienceMode = 'targeted'
    form.targetRoles.push(value)
  }
  form.targetRoleDraft = ''
}

function removeAudienceRole(value) {
  form.targetRoles = form.targetRoles.filter((role) => role !== value)
}

function addAudienceTier(value) {
  if (value && !form.targetTiers.includes(value)) {
    form.audienceMode = 'targeted'
    form.targetTiers.push(value)
  }
  form.targetTierDraft = ''
}

function removeAudienceTier(value) {
  form.targetTiers = form.targetTiers.filter((tier) => tier !== value)
}

function buildAudience() {
  return {
    mode: form.audienceMode === 'targeted' ? 'targeted' : 'all',
    userIds: normalizeList(form.targetUserIdsText),
    emails: normalizeList(form.targetEmailsText).map((email) => email.toLowerCase()),
    roles: normalizeList(form.targetRoles).map((role) => role.toLowerCase()).filter((role) => roleOptions.some((option) => option.value === role)),
    tiers: normalizeList(form.targetTiers).map((tier) => tier.toLowerCase()).filter((tier) => tierOptions.some((option) => option.value === tier)),
  }
}

function normalizeList(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[\n,; ]+/)
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))]
}

async function loadModals() {
  if (isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await adminApi.listModals()
    if (error) {
      errorMessage.value = error.message || 'Не удалось загрузить модалки'
      return
    }
    modals.value = (data || []).map(mapModal)
    if (!form.id && modals.value.length) selectModal(modals.value[0])
  } catch (error) {
    errorMessage.value = error.message || 'Не удалось загрузить модалки'
  } finally {
    isLoading.value = false
  }
}

async function saveCurrentModal() {
  if (isSaving.value) return
  const title = form.title.trim()
  if (!title) {
    notify('Укажи название модального окна', 'warning')
    activePanel.value = 'title'
    return
  }
  if (audience.value.mode === 'targeted' && !hasAudienceCriteria(audience.value)) {
    notify('Для выборочной аудитории добавь UUID, email, роль или тариф', 'warning')
    return
  }

  isSaving.value = true
  try {
    const { data, error } = await adminApi.saveModal({
      id: form.id,
      title,
      contentHtml: sanitizeHtml(form.contentHtml),
      buttons: cleanButtons.value,
      isActive: form.isActive,
      displayMode: form.displayMode,
      modalType: form.modalType,
      isBlocking: form.isBlocking,
      audience: audience.value,
    })
    if (error) {
      const message = error.message || 'Не удалось сохранить модалку'
      notify(message, 'danger', { duration: 8000 })
      return
    }
    const saved = mapModal(data)
    const exists = modals.value.some((modal) => modal.id === saved.id)
    modals.value = exists
      ? modals.value.map((modal) => (modal.id === saved.id ? saved : { ...modal, isActive: form.isActive ? false : modal.isActive }))
      : [saved, ...modals.value.map((modal) => ({ ...modal, isActive: form.isActive ? false : modal.isActive }))]
    selectModal(saved)
    closeEditor()
    notify('Модальное окно сохранено', 'success')
  } catch (error) {
    const message = error.message || 'Не удалось сохранить модалку'
    notify(message, 'danger', { duration: 8000 })
  } finally {
    isSaving.value = false
  }
}

function hasAudienceCriteria(value) {
  return Boolean(value.userIds.length || value.emails.length || value.roles.length || value.tiers.length)
}

async function deleteCurrentModal() {
  if (!form.id || isSaving.value) return
  isSaving.value = true
  try {
    const { error } = await adminApi.deleteModal(form.id)
    if (error) {
      const message = error.message || 'Не удалось удалить модалку'
      notify(message, 'danger', { duration: 8000 })
      return
    }
    const deletedId = form.id
    const nextModals = modals.value.filter((modal) => modal.id !== deletedId)
    modals.value = nextModals
    if (nextModals.length) selectModal(nextModals[0])
    else resetModalForm()
    closeEditor()
    notify('Модальное окно удалено', 'success')
  } catch (error) {
    const message = error.message || 'Не удалось удалить модалку'
    notify(message, 'danger', { duration: 8000 })
  } finally {
    isSaving.value = false
  }
}

function sanitizeHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = value || ''
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach((node) => node.remove())
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const attrValue = attribute.value || ''
      if (name.startsWith('on') || (['href', 'src'].includes(name) && /^javascript:/i.test(attrValue))) {
        node.removeAttribute(attribute.name)
      }
    })
  })
  return template.innerHTML
}

function stripHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = value || ''
  return template.content.textContent || ''
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

onMounted(loadModals)
</script>

<style scoped>
.admin-modals-page{display:grid;gap:12px}.admin-section-hero{display:flex;align-items:center;justify-content:space-between;gap:18px}.admin-section-hero span{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.admin-section-hero h1{margin:5px 0 7px}.admin-section-hero p{margin:0;color:var(--text-secondary)}.admin-hero-actions{display:flex;gap:8px;flex-wrap:wrap}.admin-modals-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start}.admin-modal-list{display:grid;gap:6px;padding:8px}.admin-modal-list button{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid transparent;border-radius:8px;padding:10px;color:var(--text-secondary);background:transparent;text-align:left}.admin-modal-list button.active,.admin-modal-list button:hover{border-color:var(--border-color);color:var(--text-primary);background:var(--control-bg)}.admin-modal-list strong,.admin-modal-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-modal-list small{margin-top:3px;color:var(--text-muted);font-size:10px}.admin-modal-list i{width:10px;height:10px;border-radius:50%;background:var(--text-muted)}.admin-modal-list i.on{background:var(--success);box-shadow:0 0 0 4px color-mix(in srgb,var(--success) 12%,transparent)}.admin-empty,.admin-state{display:grid;justify-items:center;gap:8px;padding:42px 16px;color:var(--text-secondary);text-align:center}.admin-empty svg,.admin-state span{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--control-bg));font-size:20px}.admin-state--danger span{color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg))}.modal-builder{padding:14px}.modal-builder__bar{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-color);padding-bottom:12px}.modal-builder__bar>div{display:flex;gap:8px}.modal-switch{display:flex;align-items:center;gap:8px;min-height:36px;border:1px solid var(--border-color);border-radius:999px;padding:0 10px;color:var(--text-secondary);background:var(--control-bg);font-size:11px;font-weight:800}.modal-switch--wide{width:max-content}.modal-switch input{position:absolute;opacity:0}.modal-switch span{position:relative;width:34px;height:18px;border-radius:999px;background:var(--text-muted)}.modal-switch span::after{position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:#fff;content:"";transition:.16s var(--ease-out)}.modal-switch input:checked+span{background:var(--success)}.modal-switch input:checked+span::after{transform:translateX(16px)}.modal-canvas{display:grid;place-items:center;min-height:590px;padding:26px;background:radial-gradient(circle at 50% 16%,color-mix(in srgb,var(--accent) 9%,transparent),transparent 330px)}.modal-shell-preview{display:grid;gap:10px;width:min(100%,640px);border:1px solid var(--border-strong);border-radius:16px;padding:16px;background:var(--panel-bg);box-shadow:var(--shadow-lg)}.modal-zone{display:grid;gap:6px;width:100%;border:1px dashed color-mix(in srgb,var(--accent) 42%,var(--border-color));border-radius:12px;padding:14px;color:var(--text-secondary);background:color-mix(in srgb,var(--accent) 4%,var(--control-bg));text-align:left;transition:.16s var(--ease-out)}.modal-zone:hover{border-style:solid;border-color:var(--accent-border);background:color-mix(in srgb,var(--accent) 8%,var(--control-bg));transform:translateY(-1px)}.modal-zone small{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.modal-zone strong{color:var(--text-primary);font-size:22px}.modal-zone--content{min-height:220px}.modal-zone__html{color:var(--text-secondary);line-height:1.6}.modal-zone__html :deep(h3){color:var(--text-primary)}.modal-zone__html :deep(a){color:var(--accent);font-weight:750}.modal-zone footer{display:flex;gap:8px;flex-wrap:wrap}.modal-zone footer span{display:inline-flex;align-items:center;justify-content:center;min-height:34px;border-radius:999px;padding:0 13px;font-size:12px;font-weight:800}.modal-zone footer .primary{color:var(--text-inverse);background:var(--accent)}.modal-zone footer .secondary{color:var(--text-primary);border:1px solid var(--border-color);background:var(--control-bg)}.modal-slide{position:fixed;inset:0;z-index:80;display:flex;justify-content:flex-end;background:rgba(3,4,9,.42);backdrop-filter:blur(6px)}.modal-slide__panel{display:grid;grid-template-rows:auto minmax(0,1fr) auto;width:min(520px,100%);height:100%;border-left:1px solid var(--border-color);background:var(--panel-bg);box-shadow:var(--shadow-lg)}.modal-slide__panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border-color);padding:16px}.modal-slide__panel>header small,.modal-buttons-head small{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.modal-slide__panel>header strong,.modal-buttons-head strong{display:block;margin-top:3px}.modal-slide__panel>header button{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--border-color);border-radius:50%;color:var(--text-secondary);background:var(--control-bg)}.modal-slide__body{display:grid;align-content:start;gap:14px;min-height:0;overflow:auto;padding:16px}.modal-field{display:grid;gap:6px}.modal-field>span{color:var(--text-secondary);font-size:11px;font-weight:800}.modal-buttons-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.modal-button-card{display:grid;gap:8px;border:1px solid var(--border-color);border-radius:10px;padding:10px;background:var(--card-solid)}.modal-button-card__hint{display:flex;align-items:center;min-height:36px;border:1px solid var(--border-color);border-radius:8px;padding:0 11px;color:var(--text-muted);background:var(--control-bg);font-size:11px}.modal-buttons-empty{display:grid;justify-items:center;gap:8px;border:1px dashed var(--border-color);border-radius:10px;padding:26px;color:var(--text-secondary)}.modal-buttons-empty svg{color:var(--accent);font-size:22px}.modal-slide__panel>footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding:12px 16px}.modal-slide-enter-active,.modal-slide-leave-active{transition:opacity .16s var(--ease-out)}.modal-slide-enter-active .modal-slide__panel,.modal-slide-leave-active .modal-slide__panel{transition:transform .2s var(--ease-out)}.modal-slide-enter-from,.modal-slide-leave-to{opacity:0}.modal-slide-enter-from .modal-slide__panel,.modal-slide-leave-to .modal-slide__panel{transform:translateX(100%)}@media(max-width:920px){.admin-modals-layout{grid-template-columns:1fr}.admin-modal-list{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}.modal-canvas{min-height:520px}}@media(max-width:640px){.admin-section-hero,.modal-builder__bar{display:grid}.modal-builder__bar>div,.modal-slide__panel>footer{display:grid}.modal-canvas{padding:12px}.modal-shell-preview{border-radius:12px}.modal-zone strong{font-size:18px}}
/* Polished builder skin */
.admin-modals-page {
  gap: 16px;
}

.admin-section-hero {
  min-height: 112px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 18px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, transparent), transparent 42%),
    var(--panel-bg);
  box-shadow: var(--shadow-sm);
}

.admin-section-hero h1 {
  font-size: clamp(24px, 3vw, 36px);
  line-height: 1.05;
}

.admin-section-hero p {
  max-width: 680px;
  line-height: 1.55;
}

.admin-modals-layout {
  grid-template-columns: 292px minmax(0, 1fr);
  gap: 16px;
}

.admin-modal-list.panel {
  position: sticky;
  top: 12px;
  align-content: start;
  max-height: calc(100vh - 150px);
  overflow: auto;
  border-radius: 8px;
  padding: 10px;
}

.admin-modal-list button {
  position: relative;
  min-height: 68px;
  border-color: transparent;
  border-radius: 8px;
  padding: 12px 12px 12px 14px;
}

.admin-modal-list button::before {
  position: absolute;
  inset: 10px auto 10px 0;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  content: "";
}

.admin-modal-list button.active {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color));
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 72%),
    var(--control-bg);
}

.admin-modal-list button.active::before {
  background: var(--accent);
}

.admin-modal-list strong {
  color: var(--text-primary);
  font-size: 13px;
}

.admin-modal-list small {
  font-size: 11px;
  font-weight: 750;
}

.modal-builder.panel {
  overflow: hidden;
  border-radius: 8px;
  padding: 0;
  background: var(--panel-bg);
}

.modal-builder__bar {
  min-height: 64px;
  border-bottom: 1px solid var(--border-color);
  padding: 12px 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card-solid) 88%, transparent), transparent),
    var(--panel-bg);
}

.modal-builder__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}

.modal-settings-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  padding: 12px 14px;
  background: color-mix(in srgb, var(--control-bg) 48%, transparent);
}

.modal-setting-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 11px;
  background: var(--card-solid);
}

.modal-setting-card small,
.modal-setting-card :deep(.ui-input__label),
.modal-setting-card .modal-field > span {
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.modal-setting-card strong {
  display: block;
  margin-top: 3px;
  color: var(--text-primary);
  font-size: 13px;
}

.modal-setting-card--audience {
  grid-column: 1 / -1;
  grid-template-columns: 1fr;
  align-items: stretch;
}

.modal-setting-card--audience > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.modal-setting-card--audience header span {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.modal-audience-mode {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.modal-audience-mode label {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 11px;
  background: var(--control-bg);
  cursor: pointer;
  transition:
    border-color 0.16s var(--ease-out),
    background 0.16s var(--ease-out);
}

.modal-audience-mode label.active {
  border-color: color-mix(in srgb, var(--accent) 44%, var(--border-color));
  background: color-mix(in srgb, var(--accent) 9%, var(--control-bg));
}

.modal-audience-mode input {
  width: 16px;
  height: 16px;
  margin-top: 1px;
  accent-color: var(--accent);
}

.modal-audience-mode strong,
.modal-audience-mode small {
  display: block;
  margin: 0;
  letter-spacing: 0;
  text-transform: none;
}

.modal-audience-mode small {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 650;
}

.modal-audience-targets {
  display: grid;
  gap: 10px;
}

.modal-audience-targets__inputs,
.modal-audience-pickers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.modal-audience-targets :deep(.ui-input__control--textarea) {
  min-height: 82px;
  resize: vertical;
}

.modal-audience-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 34px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 8px;
  background: var(--control-bg);
}

.modal-audience-chips button,
.modal-audience-chips > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0 9px;
  color: var(--text-secondary);
  background: var(--card-solid);
  font-size: 11px;
  font-weight: 800;
}

.modal-audience-chips button {
  color: var(--text-primary);
  cursor: pointer;
}

.modal-audience-chips button svg {
  color: var(--text-muted);
  font-size: 13px;
}

.modal-switch {
  min-height: 38px;
  border-radius: 8px;
  padding: 0 12px;
}

.modal-switch span {
  flex: 0 0 auto;
}

.modal-display-select {
  display: grid;
  grid-template-columns: auto minmax(190px, 240px);
  align-items: center;
  gap: 8px;
  margin-right: auto;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 850;
}

.modal-display-select > span {
  white-space: nowrap;
}

.modal-canvas {
  min-height: clamp(560px, 68vh, 760px);
  padding: clamp(18px, 4vw, 42px);
  background-color: color-mix(in srgb, var(--control-bg) 72%, var(--panel-bg));
  background-image:
    linear-gradient(color-mix(in srgb, var(--border-color) 54%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--border-color) 54%, transparent) 1px, transparent 1px);
  background-size: 28px 28px;
}

.modal-shell-preview {
  position: relative;
  gap: 12px;
  width: min(100%, 720px);
  border-radius: 8px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card-solid) 82%, transparent), transparent),
    var(--panel-bg);
}

.modal-shell-preview::before {
  display: block;
  width: 54px;
  height: 5px;
  margin: 0 auto 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 32%, transparent);
  content: "";
}

.modal-preview-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 7px 10px;
  color: var(--text-secondary);
  background: var(--control-bg);
  font-size: 11px;
  font-weight: 850;
}

.modal-preview-badge svg {
  font-size: 16px;
}

.modal-shell-preview--warning {
  border-color: rgba(245, 158, 11, 0.45);
}

.modal-shell-preview--warning .modal-preview-badge {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
}

.modal-shell-preview--danger,
.modal-shell-preview--maintenance,
.modal-shell-preview--blocking {
  border-color: rgba(239, 68, 68, 0.5);
}

.modal-shell-preview--danger .modal-preview-badge,
.modal-shell-preview--maintenance .modal-preview-badge {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.1);
}

.modal-shell-preview--success {
  border-color: rgba(34, 197, 94, 0.42);
}

.modal-shell-preview--success .modal-preview-badge {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.1);
}

.modal-zone {
  position: relative;
  border-width: 1.5px;
  border-radius: 8px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent),
    var(--card-solid);
}

.modal-zone::after {
  position: absolute;
  top: 12px;
  right: 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--text-muted);
  background: var(--panel-bg);
  font-size: 10px;
  font-weight: 850;
  content: "Редактировать";
  opacity: 0;
  transform: translateY(-2px);
  transition: 0.16s var(--ease-out);
}

.modal-zone:hover::after {
  opacity: 1;
  transform: translateY(0);
}

.modal-zone:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.modal-zone--title {
  min-height: 112px;
  padding-right: 132px;
}

.modal-zone--content {
  min-height: 280px;
  align-content: start;
  padding-right: 132px;
}

.modal-zone--buttons {
  min-height: 104px;
  align-content: center;
}

.modal-zone--audience {
  min-height: 98px;
  align-content: center;
  border-style: solid;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, transparent), transparent 72%),
    var(--card-solid);
}

.modal-zone small {
  margin-bottom: 2px;
}

.modal-zone > span {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.45;
}

.modal-zone strong {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: clamp(22px, 3vw, 30px);
  line-height: 1.12;
}

.modal-zone__html {
  max-height: 250px;
  overflow: hidden;
  color: var(--text-primary);
}

.modal-zone__html :deep(p) {
  margin: 0 0 10px;
}

.modal-zone__html :deep(ul) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.modal-zone footer span {
  border-radius: 8px;
}

.modal-slide {
  background: color-mix(in srgb, #05070d 58%, transparent);
}

.modal-slide__panel {
  width: min(580px, 100%);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card-solid) 72%, transparent), transparent 220px),
    var(--panel-bg);
}

.modal-slide__panel > header,
.modal-slide__panel > footer {
  padding-inline: 18px;
}

.modal-slide__panel > header button {
  border-radius: 8px;
}

.modal-slide__body {
  gap: 16px;
  padding: 18px;
}

.modal-field > span {
  color: var(--text-primary);
  font-size: 12px;
}

.modal-button-card {
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 10px;
  border-radius: 8px;
  padding: 12px;
}

.modal-button-card :deep(.ui-input),
.modal-button-card :deep(.ui-select) {
  width: 100%;
}

.modal-button-card__hint {
  border-radius: 8px;
}

.modal-button-card > button {
  justify-self: start;
}

.modal-buttons-empty {
  border-radius: 8px;
  min-height: 132px;
  background: color-mix(in srgb, var(--control-bg) 78%, transparent);
}

.modal-button-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.modal-button-card {
  grid-template-columns: 1fr;
}

.modal-button-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.modal-button-card__top span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.modal-button-card__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  gap: 10px;
}

.modal-buttons-empty span {
  color: var(--text-muted);
  font-size: 12px;
}

.modal-audience-grid {
  display: grid;
  gap: 12px;
}

.modal-check-group {
  display: grid;
  gap: 7px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 11px;
  background: var(--card-solid);
}

.modal-check-group > span {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 850;
}

.modal-check-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  color: var(--text-secondary);
  font-size: 12px;
}

.modal-check-group input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

.modal-check-group b {
  font-weight: 750;
}

.modal-audience-note {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--warning) 26%, var(--border-color));
  border-radius: 8px;
  padding: 11px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--warning) 8%, var(--control-bg));
  font-size: 12px;
  line-height: 1.45;
}

.modal-audience-note svg {
  color: var(--warning);
  font-size: 18px;
}

@media (max-width: 1040px) {
  .admin-modal-list.panel {
    position: static;
    max-height: none;
  }
}

@media (max-width: 760px) {
  .admin-section-hero {
    padding: 14px;
  }

  .admin-hero-actions,
  .modal-builder__bar > div {
    display: grid;
    grid-template-columns: 1fr;
  }

  .modal-zone,
  .modal-zone--title,
  .modal-zone--content {
    padding-right: 16px;
  }

  .modal-zone::after {
    display: none;
  }

  .modal-button-card {
    grid-template-columns: 1fr;
  }

  .modal-button-card__row {
    grid-template-columns: 1fr;
  }

  .modal-button-actions {
    justify-content: stretch;
  }

  .modal-display-select {
    grid-template-columns: 1fr;
    margin-right: 0;
  }
}
</style>
