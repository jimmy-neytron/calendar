<template>
  <section class="purchases-page">
    <header class="purchases-hero">
      <div class="purchases-hero__copy">
        <span>Список желаний</span>
        <h1>Что хочу купить</h1>
        <p>Собирайте технику, инструменты и любые вещи в одном красивом списке.</p>
      </div>
      <div class="purchases-hero__stats">
        <article><small>В списке</small><strong>{{ activeItems.length }}</strong></article>
        <article><small>Примерная сумма</small><strong>{{ activeTotalLabel }}</strong></article>
        <article><small>Уже куплено</small><strong>{{ boughtItems.length }}</strong></article>
      </div>
      <span class="purchases-hero__art" aria-hidden="true">
        <UiIcon name="shopping" />
      </span>
    </header>

    <section class="link-import">
      <span class="link-import__icon"><UiIcon name="link" /></span>
      <div class="link-import__copy">
        <strong>Добавить товар по ссылке</strong>
        <small>Вставьте ссылку на товар — попробуем определить название, цену, валюту и изображение.</small>
      </div>
      <UiInput
        v-model="quickUrl"
        type="url"
        placeholder="https://example.com/product/..."
        :disabled="isImporting"
        @keydown.enter="importQuickLink"
      />
      <UiButton icon="sparkles" :loading="isImporting" :disabled="!isValidHttpUrl(quickUrl)" @click="importQuickLink">
        Создать карточку
      </UiButton>
      <button type="button" class="link-import__manual" @click="openCreateModal">
        Добавить вручную
      </button>
    </section>

    <section class="purchases-toolbar">
      <UiInput v-model="search" type="search" placeholder="Поиск по покупкам" />
      <label>
        <span>Категория</span>
        <UiSelect v-model="categoryFilter">
          <option value="all">Все категории</option>
          <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
        </UiSelect>
      </label>
      <label>
        <span>Статус</span>
        <UiSelect v-model="statusFilter">
          <option value="active">Хочу купить</option>
          <option value="thinking">Думаю</option>
          <option value="bought">Куплено</option>
          <option value="all">Все</option>
        </UiSelect>
      </label>
      <label>
        <span>Сортировка</span>
        <UiSelect v-model="sortBy">
          <option value="priority">Сначала важные</option>
          <option value="newest">Сначала новые</option>
          <option value="priceAsc">Сначала дешевле</option>
          <option value="priceDesc">Сначала дороже</option>
        </UiSelect>
      </label>
      <div class="purchase-view-switch" aria-label="Режим отображения">
        <button type="button" :class="{ active: viewMode === 'cards' }" title="Карточки" @click="viewMode = 'cards'">
          <UiIcon name="grid" /> <span>Карточки</span>
        </button>
        <button type="button" :class="{ active: viewMode === 'table' }" title="Таблица" @click="viewMode = 'table'">
          <UiIcon name="table" /> <span>Таблица</span>
        </button>
      </div>
    </section>

    <div v-if="filteredItems.length && viewMode === 'cards'" class="purchase-grid">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        class="purchase-card"
        :class="{ 'purchase-card--bought': item.status === 'bought' }"
      >
        <div class="purchase-card__media">
          <img
            v-if="hasVisibleImage(item)"
            :src="item.imageUrl"
            :alt="item.title"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="hideImage(item.id)"
          >
          <span v-else><UiIcon :name="categoryMeta(item.category).icon" /></span>
        </div>

        <div class="purchase-card__body">
          <header>
            <a
              v-if="isValidHttpUrl(item.productUrl)"
              class="purchase-card__store"
              :href="item.productUrl"
              target="_blank"
              rel="noopener noreferrer"
              :title="`Добавлено по ссылке с сайта ${storeLabel(item)}`"
            >
              <UiIcon name="globe" />
              <span>{{ storeLabel(item) }}</span>
            </a>
            <small v-else>Добавлено вручную</small>
            <span :class="`status-${item.status}`">{{ statusMeta(item.status).label }}</span>
          </header>
          <h2>{{ item.title }}</h2>
          <div class="purchase-card__meta">
            <span><UiIcon :name="categoryMeta(item.category).icon" /> {{ categoryMeta(item.category).label }}</span>
            <span v-if="item.priority > 0">{{ priorityLabel(item.priority) }}</span>
          </div>
          <p v-if="item.description">{{ item.description }}</p>

          <div class="purchase-card__price">
            <strong>{{ item.currentPrice ? formatPrice(item.currentPrice, item.currency) : 'Цена не указана' }}</strong>
            <small v-if="item.targetPrice">Хочу купить до {{ formatPrice(item.targetPrice, item.currency) }}</small>
          </div>

          <footer>
            <a v-if="isValidHttpUrl(item.productUrl)" :href="item.productUrl" target="_blank" rel="noopener noreferrer">
              Открыть товар <UiIcon name="right" />
            </a>
            <span v-else />
            <div>
              <UiIconButton icon="edit" label="Изменить покупку" @click="openEditModal(item)" />
              <UiIconButton
                :icon="item.status === 'bought' ? 'refresh' : 'check'"
                :label="item.status === 'bought' ? 'Вернуть в список' : 'Отметить купленным'"
                @click="toggleBought(item)"
              />
              <UiIconButton icon="trash" label="Удалить покупку" variant="danger" @click="openDeleteModal(item)" />
            </div>
          </footer>
        </div>
      </article>
    </div>

    <div v-else-if="filteredItems.length" class="purchase-table-wrap">
      <table class="purchase-table">
        <thead>
          <tr><th>Товар</th><th>Магазин</th><th>Категория</th><th>Цена</th><th>Статус</th><th aria-label="Действия" /></tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.id" :class="{ 'purchase-table__row--bought': item.status === 'bought' }">
            <td>
              <div class="purchase-table__product">
                <span class="purchase-table__thumb">
                  <img v-if="hasVisibleImage(item)" :src="item.imageUrl" :alt="item.title" loading="lazy" referrerpolicy="no-referrer" @error="hideImage(item.id)">
                  <UiIcon v-else :name="categoryMeta(item.category).icon" />
                </span>
                <div><strong>{{ item.title }}</strong><small>{{ item.description || priorityLabel(item.priority) }}</small></div>
              </div>
            </td>
            <td>
              <a v-if="isValidHttpUrl(item.productUrl)" class="purchase-table__store" :href="item.productUrl" target="_blank" rel="noopener noreferrer">
                <UiIcon name="globe" /> <span>{{ storeLabel(item) }}</span>
              </a>
              <span v-else class="purchase-table__manual">Вручную</span>
            </td>
            <td><span class="purchase-table__category"><UiIcon :name="categoryMeta(item.category).icon" /> {{ categoryMeta(item.category).label }}</span></td>
            <td><strong class="purchase-table__price">{{ item.currentPrice ? formatPrice(item.currentPrice, item.currency) : 'Не указана' }}</strong></td>
            <td><span :class="[`status-${item.status}`, 'purchase-table__status']">{{ statusMeta(item.status).label }}</span></td>
            <td>
              <div class="purchase-table__actions">
                <UiIconButton icon="edit" label="Изменить покупку" @click="openEditModal(item)" />
                <UiIconButton :icon="item.status === 'bought' ? 'refresh' : 'check'" :label="item.status === 'bought' ? 'Вернуть в список' : 'Отметить купленным'" @click="toggleBought(item)" />
                <UiIconButton icon="trash" label="Удалить покупку" variant="danger" @click="openDeleteModal(item)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section v-else class="purchases-empty">
      <span><UiIcon name="shopping" /></span>
      <h2>{{ items.length ? 'Ничего не найдено' : 'Список покупок пока пуст' }}</h2>
      <p>{{ items.length ? 'Измените поиск или фильтры.' : 'Добавьте первую вещь вручную или просто вставьте ссылку на товар.' }}</p>
      <UiButton v-if="!items.length" icon="plus" @click="openCreateModal">Добавить покупку</UiButton>
    </section>

    <UiModal v-model="isEditorOpen" :title="editingItem ? 'Изменить покупку' : 'Новая покупка'" eyebrow="Список желаний" width="680px" :close-on-overlay="!isSaving">
      <form class="purchase-editor" @submit.prevent="saveItem">
        <div class="purchase-editor__link">
          <UiInput v-model="form.productUrl" type="url" label="Ссылка на товар" placeholder="https://..." />
          <UiButton type="button" size="sm" variant="secondary" icon="sparkles" :loading="isEditorImporting" :disabled="!isValidHttpUrl(form.productUrl)" @click="importEditorLink">
            Заполнить
          </UiButton>
        </div>

        <div v-if="form.imageUrl" class="purchase-editor__preview">
          <img :src="form.imageUrl" alt="Предпросмотр товара" referrerpolicy="no-referrer">
          <div><small>Предпросмотр</small><strong>{{ form.title || 'Название товара' }}</strong></div>
        </div>

        <div class="purchase-editor__grid">
          <UiInput v-model="form.title" label="Название" placeholder="Например, шуруповёрт" required />
          <label class="purchase-field">
            <span>Категория</span>
            <UiSelect v-model="form.category">
              <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
            </UiSelect>
          </label>
          <UiInput v-model="form.currentPrice" type="number" min="0" step="0.01" :label="`Текущая цена, ${form.currency}`" placeholder="0" />
          <UiInput v-model="form.targetPrice" type="number" min="0" step="0.01" :label="`Желаемая цена, ${form.currency}`" placeholder="Необязательно" />
          <label class="purchase-field">
            <span>Валюта</span>
            <UiSelect v-model="form.currency">
              <option v-for="currency in currencyOptions" :key="currency.value" :value="currency.value">{{ currency.label }}</option>
            </UiSelect>
          </label>
          <label class="purchase-field">
            <span>Статус</span>
            <UiSelect v-model="form.status">
              <option value="wanted">Хочу купить</option>
              <option value="thinking">Пока думаю</option>
              <option value="bought">Куплено</option>
            </UiSelect>
          </label>
          <label class="purchase-field">
            <span>Важность</span>
            <UiSelect v-model="form.priority">
              <option :value="0">Обычная</option>
              <option :value="1">Желательно</option>
              <option :value="2">Важно</option>
              <option :value="3">Очень важно</option>
            </UiSelect>
          </label>
        </div>

        <UiInput v-model="form.imageUrl" type="url" label="Ссылка на изображение" placeholder="Заполнится автоматически или вставьте вручную" />
        <UiInput v-model="form.description" type="textarea" label="Заметка" placeholder="Почему хотите купить, нужная модель, размер или цвет…" />
        <p v-if="editorError" class="purchase-editor__error">{{ editorError }}</p>

        <footer>
          <UiButton type="button" variant="secondary" :disabled="isSaving" @click="isEditorOpen = false">Отмена</UiButton>
          <UiButton type="submit" icon="check" :loading="isSaving" :disabled="!String(form.title || '').trim()">Сохранить</UiButton>
        </footer>
      </form>
    </UiModal>

    <UiModal v-model="isDeleteOpen" title="Удалить покупку?" eyebrow="Список желаний" width="440px" :close-on-overlay="!isDeleting">
      <div class="purchase-delete">
        <span><UiIcon name="trash" /></span>
        <strong>{{ deletingItem?.title }}</strong>
        <p>Карточка будет удалена из общего списка пространства.</p>
        <footer>
          <UiButton variant="secondary" :disabled="isDeleting" @click="isDeleteOpen = false">Отмена</UiButton>
          <UiButton variant="danger" icon="trash" :loading="isDeleting" @click="deleteItem">Удалить</UiButton>
        </footer>
      </div>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { purchaseWishlistStore } from '../../../stores/purchaseWishlist.store'
import type { ProductLinkPreview, PurchaseCategory, PurchaseItem, PurchaseStatus } from '../../../types/purchase'
import { loadProductPreview } from '../api/productPreview.api'

interface PurchaseForm {
  title: string
  description: string
  category: PurchaseCategory
  status: PurchaseStatus
  productUrl: string
  imageUrl: string
  source: string
  currentPrice: number | string
  targetPrice: number | string
  currency: string
  priority: number
}

const categories: Array<{ value: PurchaseCategory; label: string; icon: string }> = [
  { value: 'tools', label: 'Инструменты', icon: 'settings' },
  { value: 'electronics', label: 'Техника', icon: 'activity' },
  { value: 'home', label: 'Для дома', icon: 'home' },
  { value: 'clothes', label: 'Одежда', icon: 'heart' },
  { value: 'hobby', label: 'Хобби', icon: 'sparkles' },
  { value: 'other', label: 'Другое', icon: 'shopping' },
]

const statuses: Array<{ value: PurchaseStatus; label: string }> = [
  { value: 'wanted', label: 'Хочу купить' },
  { value: 'thinking', label: 'Думаю' },
  { value: 'bought', label: 'Куплено' },
]

const commonCurrencies = [
  { value: 'RUB', label: 'Российский рубль (RUB)' },
  { value: 'BYN', label: 'Белорусский рубль (BYN)' },
  { value: 'KZT', label: 'Казахстанский тенге (KZT)' },
  { value: 'USD', label: 'Доллар США (USD)' },
  { value: 'EUR', label: 'Евро (EUR)' },
  { value: 'GBP', label: 'Фунт стерлингов (GBP)' },
  { value: 'CNY', label: 'Китайский юань (CNY)' },
  { value: 'JPY', label: 'Японская иена (JPY)' },
  { value: 'TRY', label: 'Турецкая лира (TRY)' },
  { value: 'PLN', label: 'Польский злотый (PLN)' },
  { value: 'CHF', label: 'Швейцарский франк (CHF)' },
]

const { notify } = useNotification()
const items = purchaseWishlistStore.items
const quickUrl = ref('')
const search = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('active')
const sortBy = ref('priority')
const viewMode = ref<'cards' | 'table'>('cards')
const isImporting = ref(false)
const isEditorImporting = ref(false)
const isEditorOpen = ref(false)
const isSaving = ref(false)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const editingItem = ref<PurchaseItem | null>(null)
const deletingItem = ref<PurchaseItem | null>(null)
const editorError = ref('')
const failedImages = ref(new Set<string>())
const form = reactive<PurchaseForm>(emptyForm())

const activeItems = computed(() => items.value.filter((item) => item.status !== 'bought'))
const boughtItems = computed(() => items.value.filter((item) => item.status === 'bought'))
const currencyOptions = computed(() => {
  const current = String(form.currency || '').toUpperCase()
  return current && !commonCurrencies.some((currency) => currency.value === current)
    ? [{ value: current, label: current }, ...commonCurrencies]
    : commonCurrencies
})
const activeTotalLabel = computed(() => {
  const totals = new Map<string, number>()
  activeItems.value.forEach((item) => {
    if (!item.currentPrice) return
    const currency = item.currency || 'RUB'
    totals.set(currency, (totals.get(currency) || 0) + item.currentPrice)
  })
  return [...totals.entries()].map(([currency, total]) => formatPrice(total, currency)).join(' · ') || '0 ₽'
})
const filteredItems = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  const filtered = items.value.filter((item) => {
    const matchesSearch = !query || `${item.title} ${item.description} ${item.source}`.toLocaleLowerCase('ru-RU').includes(query)
    const matchesCategory = categoryFilter.value === 'all' || item.category === categoryFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' ? item.status === 'wanted' : item.status === statusFilter.value)
    return matchesSearch && matchesCategory && matchesStatus
  })
  return [...filtered].sort((first, second) => {
    if (sortBy.value === 'newest') return second.createdAt.localeCompare(first.createdAt)
    if (sortBy.value === 'priceAsc') return priceForSort(first) - priceForSort(second)
    if (sortBy.value === 'priceDesc') return priceForSort(second) - priceForSort(first)
    return second.priority - first.priority || second.createdAt.localeCompare(first.createdAt)
  })
})

async function importQuickLink() {
  if (!isValidHttpUrl(quickUrl.value) || isImporting.value) return
  isImporting.value = true
  try {
    const preview = await loadProductPreview(quickUrl.value)
    openCreateModal(preview)
    quickUrl.value = ''
  } catch (error) {
    openCreateModal({ productUrl: quickUrl.value })
    notify(error instanceof Error ? error.message : 'Не удалось заполнить карточку автоматически', 'warning')
  } finally {
    isImporting.value = false
  }
}

function openCreateModal(preview?: Partial<ProductLinkPreview>) {
  editingItem.value = null
  editorError.value = ''
  Object.assign(form, emptyForm(), preview ? previewToForm(preview) : {})
  isEditorOpen.value = true
}

function openEditModal(item: PurchaseItem) {
  editingItem.value = item
  editorError.value = ''
  Object.assign(form, {
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    productUrl: item.productUrl,
    imageUrl: item.imageUrl,
    source: item.source,
    currentPrice: item.currentPrice || '',
    targetPrice: item.targetPrice || '',
    currency: item.currency,
    priority: item.priority,
  })
  isEditorOpen.value = true
}

async function importEditorLink() {
  if (!isValidHttpUrl(form.productUrl) || isEditorImporting.value) return
  isEditorImporting.value = true
  editorError.value = ''
  try {
    const preview = await loadProductPreview(form.productUrl)
    Object.assign(form, previewToForm(preview), {
      category: form.category,
      status: form.status,
      targetPrice: form.targetPrice,
      priority: form.priority,
    })
    notify('Данные товара заполнены', 'success')
  } catch (error) {
    editorError.value = error instanceof Error ? error.message : 'Не удалось прочитать страницу товара'
  } finally {
    isEditorImporting.value = false
  }
}

async function saveItem() {
  const title = String(form.title || '').trim()
  if (!title || isSaving.value) return
  isSaving.value = true
  editorError.value = ''
  const payload = {
    title,
    description: String(form.description || '').trim(),
    category: form.category,
    status: form.status,
    productUrl: normalizedUrl(form.productUrl),
    imageUrl: normalizedUrl(form.imageUrl),
    source: String(form.source || '').trim() || sourceFromUrl(form.productUrl),
    currentPrice: Math.max(0, Number(form.currentPrice || 0)),
    targetPrice: Math.max(0, Number(form.targetPrice || 0)),
    currency: form.currency || 'RUB',
    priority: Number(form.priority || 0),
  }
  const result = editingItem.value
    ? await purchaseWishlistStore.update(editingItem.value.id, payload)
    : await purchaseWishlistStore.create(payload)
  isSaving.value = false
  if (!result.ok) {
    editorError.value = result.message || 'Не удалось сохранить покупку'
    return
  }
  isEditorOpen.value = false
  notify(editingItem.value ? 'Карточка обновлена' : 'Покупка добавлена', 'success')
}

async function toggleBought(item: PurchaseItem) {
  const nextStatus: PurchaseStatus = item.status === 'bought' ? 'wanted' : 'bought'
  const result = await purchaseWishlistStore.update(item.id, { status: nextStatus })
  notify(result.ok ? (nextStatus === 'bought' ? 'Отмечено как купленное' : 'Возвращено в список') : result.message, result.ok ? 'success' : 'warning')
}

function openDeleteModal(item: PurchaseItem) {
  deletingItem.value = item
  isDeleteOpen.value = true
}

async function deleteItem() {
  if (!deletingItem.value || isDeleting.value) return
  isDeleting.value = true
  const result = await purchaseWishlistStore.remove(deletingItem.value.id)
  isDeleting.value = false
  if (!result.ok) return notify(result.message || 'Не удалось удалить покупку', 'warning')
  isDeleteOpen.value = false
  deletingItem.value = null
  notify('Покупка удалена', 'success')
}

function emptyForm(): PurchaseForm {
  return {
    title: '', description: '', category: 'other', status: 'wanted', productUrl: '', imageUrl: '',
    source: '', currentPrice: '', targetPrice: '', currency: 'RUB', priority: 0,
  }
}

function previewToForm(preview: Partial<ProductLinkPreview>): Partial<PurchaseForm> {
  return {
    title: String(preview.title || ''),
    description: String(preview.description || ''),
    productUrl: String(preview.productUrl || ''),
    imageUrl: String(preview.imageUrl || ''),
    source: String(preview.source || ''),
    currentPrice: preview.price || '',
    currency: preview.currency || 'RUB',
  }
}

function categoryMeta(category: PurchaseCategory) {
  return categories.find((item) => item.value === category) || categories.at(-1)!
}

function statusMeta(status: PurchaseStatus) {
  return statuses.find((item) => item.value === status) || statuses[0]
}

function priorityLabel(priority: number) {
  return priority >= 3 ? 'Очень важно' : priority === 2 ? 'Важно' : 'Желательно'
}

function formatPrice(value: number, currency = 'RUB') {
  if (!value) return '0 ₽'
  try {
    const locale = currency === 'BYN' ? 'ru-BY' : 'ru-RU'
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ${currency}`
  }
}

function storeLabel(item: PurchaseItem) {
  return item.source.trim() || sourceFromUrl(item.productUrl) || 'Сайт магазина'
}

function priceForSort(item: PurchaseItem) {
  return item.currentPrice || Number.MAX_SAFE_INTEGER
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizedUrl(value: string) {
  return isValidHttpUrl(value) ? value.trim() : ''
}

function sourceFromUrl(value: string) {
  if (!isValidHttpUrl(value)) return ''
  return new URL(value).hostname.replace(/^www\./, '')
}

function hasVisibleImage(item: PurchaseItem) {
  return isValidHttpUrl(item.imageUrl) && !failedImages.value.has(item.id)
}

function hideImage(id: string) {
  failedImages.value = new Set([...failedImages.value, id])
}
</script>

<style scoped>
.purchases-page{display:grid;gap:14px;width:min(100%,1180px);margin:0 auto;padding:14px}.purchases-hero,.link-import,.purchases-toolbar,.purchases-empty{border:1px solid var(--border-color);border-radius:20px;background:var(--panel-bg);box-shadow:var(--shadow-sm)}.purchases-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:20px;overflow:hidden;padding:23px 25px;background:radial-gradient(circle at 92% 18%,color-mix(in srgb,#f59e0b 17%,transparent),transparent 250px),var(--panel-bg)}.purchases-hero__copy{position:relative;z-index:1}.purchases-hero__copy>span,.link-import__copy small,.purchases-toolbar label>span{color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.purchases-hero h1{margin:5px 0 7px;font-size:clamp(27px,4vw,40px);line-height:1.05}.purchases-hero p{max-width:610px;margin:0;color:var(--text-secondary);line-height:1.55}.purchases-hero__stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,minmax(95px,1fr));gap:8px}.purchases-hero__stats article{display:grid;gap:4px;border:1px solid color-mix(in srgb,#f59e0b 18%,var(--border-color));border-radius:13px;padding:11px 12px;background:color-mix(in srgb,#f59e0b 6%,var(--control-bg))}.purchases-hero__stats small{color:var(--text-muted);font-size:8px;text-transform:uppercase}.purchases-hero__stats strong{white-space:nowrap;font-size:16px}.purchases-hero__art{position:absolute;right:-28px;top:-52px;color:color-mix(in srgb,#f59e0b 13%,transparent);font-size:190px;transform:rotate(-9deg)}.link-import{display:grid;grid-template-columns:44px minmax(180px,.8fr) minmax(260px,1.3fr) auto;align-items:center;gap:12px;padding:14px 15px}.link-import__icon{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 11%,var(--control-bg));font-size:19px}.link-import__copy strong,.link-import__copy small{display:block}.link-import__copy small{margin-top:3px;line-height:1.4;text-transform:none;letter-spacing:0}.link-import__manual{grid-column:3/-1;justify-self:end;border:0;padding:0;color:var(--text-muted);background:transparent;font-size:10px}.link-import__manual:hover{color:var(--text-primary)}.purchases-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) repeat(3,minmax(145px,.45fr));align-items:end;gap:8px;padding:10px}.purchases-toolbar label{display:grid;gap:5px}.purchases-toolbar :deep(.ui-select__trigger){width:100%}.purchase-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.purchase-card{display:grid;grid-template-rows:190px minmax(0,1fr);min-width:0;overflow:hidden;border:1px solid var(--border-color);border-radius:19px;background:var(--card-solid);box-shadow:var(--shadow-sm);transition:.2s var(--ease-out)}.purchase-card:hover{border-color:color-mix(in srgb,#f59e0b 30%,var(--border-color));box-shadow:var(--shadow-md);transform:translateY(-2px)}.purchase-card--bought{opacity:.68}.purchase-card__media{position:relative;display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,color-mix(in srgb,#f59e0b 10%,var(--control-bg)),var(--control-bg))}.purchase-card__media>img{width:100%;height:100%;object-fit:cover}.purchase-card__media>span{display:grid;place-items:center;width:74px;height:74px;border-radius:24px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 10%,var(--card-bg));font-size:32px;transform:rotate(-6deg)}.purchase-card__media>b,.purchase-card__media>em{position:absolute;top:10px;border:1px solid color-mix(in srgb,white 12%,var(--border-color));border-radius:999px;padding:5px 8px;background:color-mix(in srgb,var(--panel-bg) 88%,transparent);backdrop-filter:blur(9px);font-size:8px;font-style:normal}.purchase-card__media>b{left:10px;color:#f59e0b}.purchase-card__media>em{right:10px;color:var(--text-secondary)}.purchase-card__body{display:grid;align-content:start;gap:9px;padding:13px}.purchase-card__body>header{display:flex;align-items:center;justify-content:space-between;gap:8px}.purchase-card__body>header small{overflow:hidden;color:var(--text-muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.purchase-card__body>header span{border-radius:99px;padding:4px 7px;font-size:8px;font-weight:800}.status-wanted{color:#f59e0b;background:color-mix(in srgb,#f59e0b 10%,var(--control-bg))}.status-thinking{color:var(--info);background:color-mix(in srgb,var(--info) 10%,var(--control-bg))}.status-bought{color:var(--success);background:color-mix(in srgb,var(--success) 10%,var(--control-bg))}.purchase-card h2{display:-webkit-box;overflow:hidden;margin:0;font-size:16px;line-height:1.3;-webkit-box-orient:vertical;-webkit-line-clamp:2}.purchase-card__body>p{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-muted);font-size:10px;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.purchase-card__price{display:grid;gap:2px;margin-top:2px}.purchase-card__price strong{font-size:19px}.purchase-card__price small{color:var(--text-muted);font-size:9px}.purchase-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;border-top:1px solid var(--border-color);padding-top:10px}.purchase-card footer>a{display:flex;align-items:center;gap:4px;color:#f59e0b;font-size:10px;font-weight:750;text-decoration:none}.purchase-card footer>div{display:flex;gap:4px}.purchases-empty{display:grid;justify-items:center;gap:7px;min-height:320px;padding:30px;color:var(--text-muted);text-align:center}.purchases-empty>span{display:grid;place-items:center;width:64px;height:64px;border-radius:20px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 10%,var(--control-bg));font-size:28px}.purchases-empty h2{margin:4px 0 0;color:var(--text-primary)}.purchases-empty p{margin:0 0 8px}.purchase-editor{display:grid;gap:13px}.purchase-editor__link{display:grid;grid-template-columns:1fr auto;align-items:end;gap:8px;border:1px solid color-mix(in srgb,#f59e0b 20%,var(--border-color));border-radius:14px;padding:11px;background:color-mix(in srgb,#f59e0b 5%,var(--control-bg))}.purchase-editor__preview{display:grid;grid-template-columns:64px 1fr;align-items:center;gap:11px;overflow:hidden;border:1px solid var(--border-color);border-radius:14px;padding:8px;background:var(--card-bg)}.purchase-editor__preview img{width:64px;height:58px;border-radius:10px;object-fit:cover}.purchase-editor__preview small,.purchase-editor__preview strong{display:block}.purchase-editor__preview small{margin-bottom:3px;color:var(--text-muted);font-size:8px;text-transform:uppercase}.purchase-editor__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.purchase-field{display:grid;gap:5px}.purchase-field>span{color:var(--text-secondary);font-size:11px;font-weight:700}.purchase-field :deep(.ui-select__trigger){width:100%}.purchase-editor__error{margin:0;border-radius:10px;padding:9px 10px;color:var(--danger);background:color-mix(in srgb,var(--danger) 9%,var(--control-bg));font-size:10px}.purchase-editor>footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:12px}.purchase-delete{display:grid;justify-items:center;gap:8px;text-align:center}.purchase-delete>span{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:var(--danger);background:color-mix(in srgb,var(--danger) 10%,var(--control-bg));font-size:22px}.purchase-delete>strong{font-size:16px}.purchase-delete>p{margin:0;color:var(--text-muted)}.purchase-delete>footer{display:flex;justify-content:center;gap:8px;width:100%;margin-top:6px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:980px){.purchase-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.purchases-hero{grid-template-columns:1fr}.link-import{grid-template-columns:44px minmax(0,1fr) auto}.link-import>.ui-input{grid-column:1/-2}.link-import__manual{grid-column:1/-1}.purchases-toolbar{grid-template-columns:repeat(3,minmax(0,1fr))}.purchases-toolbar>.ui-input{grid-column:1/-1}}@media(max-width:640px){.purchases-page{padding:10px}.purchases-hero{padding:18px}.purchases-hero__stats,.purchase-grid,.purchases-toolbar,.purchase-editor__grid{grid-template-columns:1fr}.purchases-hero__stats{display:flex;overflow:auto}.purchases-hero__stats article{min-width:125px}.link-import{grid-template-columns:40px minmax(0,1fr)}.link-import>.ui-input,.link-import>.ui-button{grid-column:1/-1}.link-import__manual{justify-self:center}.purchase-card{grid-template-rows:175px auto}.purchase-editor__link{grid-template-columns:1fr}.purchase-editor__link>.ui-button{justify-self:end}}
.purchases-hero{padding:20px}
.purchases-hero__copy>span{font-size:10px;font-weight:800;letter-spacing:.11em}
.purchases-hero h1{margin:3px 0 6px;font-size:clamp(22px,3vw,34px);line-height:1.08}
.purchases-hero p{max-width:650px;line-height:inherit}
.purchases-toolbar{grid-template-columns:minmax(220px,1fr) repeat(3,minmax(135px,.42fr)) auto}
.purchase-view-switch{display:flex;align-items:center;gap:3px;align-self:end;border:1px solid var(--border-color);border-radius:11px;padding:3px;background:var(--control-bg)}
.purchase-view-switch button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:34px;border:0;border-radius:8px;padding:0 10px;color:var(--text-muted);background:transparent;font:inherit;font-size:10px;font-weight:750;cursor:pointer;transition:.18s var(--ease-out)}
.purchase-view-switch button:hover{color:var(--text-primary)}
.purchase-view-switch button.active{color:#171006;background:#f59e0b;box-shadow:0 5px 16px color-mix(in srgb,#f59e0b 22%,transparent)}
.purchase-view-switch .ui-icon{font-size:14px}
.purchase-card__store{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:65%;color:var(--text-muted);font-size:9px;font-weight:700;text-decoration:none}
.purchase-card__store span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.purchase-card__store>span{padding:0;background:transparent;font-size:inherit;font-weight:inherit}
.purchase-card__store .ui-icon{flex:0 0 auto;color:var(--text-secondary);font-size:12px}
.purchase-card__store:hover{color:var(--text-primary)}
.purchase-table-wrap{overflow-x:auto;border:1px solid var(--border-color);border-radius:18px;background:var(--card-solid);box-shadow:var(--shadow-sm)}
.purchase-table{width:100%;min-width:940px;border-collapse:collapse}
.purchase-table th{padding:12px 14px;color:var(--text-muted);background:var(--control-bg);font-size:9px;font-weight:850;letter-spacing:.08em;text-align:left;text-transform:uppercase}
.purchase-table td{border-top:1px solid var(--border-color);padding:11px 14px;vertical-align:middle}
.purchase-table tbody tr{transition:background .18s var(--ease-out)}
.purchase-table tbody tr:hover{background:color-mix(in srgb,#f59e0b 4%,var(--card-solid))}
.purchase-table__row--bought{opacity:.62}
.purchase-table__product{display:grid;grid-template-columns:52px minmax(180px,1fr);align-items:center;gap:11px;min-width:0}
.purchase-table__thumb{display:grid;place-items:center;width:52px;height:52px;overflow:hidden;border-radius:13px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 9%,var(--control-bg));font-size:20px}
.purchase-table__thumb img{width:100%;height:100%;object-fit:cover}
.purchase-table__product strong,.purchase-table__product small{display:block;overflow:hidden;max-width:340px;text-overflow:ellipsis;white-space:nowrap}
.purchase-table__product strong{font-size:12px}.purchase-table__product small{margin-top:4px;color:var(--text-muted);font-size:9px}
.purchase-table__store,.purchase-table__category{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.purchase-table__store{border-radius:999px;padding:6px 9px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 8%,var(--control-bg));font-size:10px;font-weight:800;text-decoration:none}
.purchase-table__manual{color:var(--text-muted);font-size:10px}.purchase-table__category{color:var(--text-secondary);font-size:10px}
.purchase-table__price{white-space:nowrap;font-size:13px}.purchase-table__status{display:inline-flex;border-radius:999px;padding:5px 8px;white-space:nowrap;font-size:9px;font-weight:800}
.purchase-table__actions{display:flex;justify-content:flex-end;gap:4px}
@media(max-width:1100px){.purchases-toolbar{grid-template-columns:repeat(3,minmax(0,1fr))}.purchases-toolbar>.ui-input{grid-column:1/-1}.purchase-view-switch{justify-self:end}}
.purchase-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.purchase-card{grid-template-columns:184px minmax(0,1fr);grid-template-rows:minmax(238px,auto);gap:16px;overflow:hidden;padding:10px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-solid);box-shadow:none;transition:border-color .18s var(--ease-out),background .18s var(--ease-out)}
.purchase-card:hover{border-color:var(--border-strong);background:color-mix(in srgb,var(--card-solid) 96%,var(--text-primary));box-shadow:none;transform:none}
.purchase-card__media{min-height:218px;border:0;border-radius:13px;background:var(--control-bg)}
.purchase-card__media:after{display:none}
.purchase-card__media>img{object-fit:cover;transition:none}
.purchase-card__media>span{width:58px;height:58px;border:1px solid var(--border-color);border-radius:16px;color:var(--text-secondary);background:var(--card-solid);box-shadow:none;font-size:24px;transform:none}
.purchase-card__body{display:flex;min-width:0;flex-direction:column;align-content:initial;gap:8px;padding:4px 6px 3px 0}
.purchase-card__body>header{min-width:0}
.purchase-card__body>header>span{display:inline-flex;align-items:center;gap:5px;padding:0;color:var(--text-secondary);background:transparent;font-size:8px;font-weight:750}
.purchase-card__body>header>span:before{width:5px;height:5px;border-radius:50%;content:"";background:currentColor}
.purchase-card h2{margin-top:4px;font-size:17px;font-weight:750;line-height:1.28;letter-spacing:-.018em}
.purchase-card__meta{display:flex;align-items:center;gap:10px;color:var(--text-muted);font-size:9px}
.purchase-card__meta span{display:inline-flex;align-items:center;gap:5px;min-width:0}
.purchase-card__meta span+span:before{width:3px;height:3px;border-radius:50%;content:"";background:var(--text-muted)}
.purchase-card__meta .ui-icon{font-size:11px}
.purchase-card__body>p{align-self:start;-webkit-line-clamp:2}
.purchase-card__price{margin-top:auto;border:0;padding:4px 0 1px;background:transparent}
.purchase-card__price strong{font-size:22px;font-weight:780;letter-spacing:-.035em}
.purchase-card footer{margin:3px 0 0;padding-top:9px}
.purchase-card footer>a{color:var(--text-secondary);font-weight:700}
.purchase-card footer>a:hover{color:var(--text-primary)}
@media(max-width:980px){.purchase-grid{grid-template-columns:1fr}.purchase-card{grid-template-columns:190px minmax(0,1fr)}}
@media(max-width:640px){.purchases-hero{padding:14px}.purchase-view-switch{justify-self:stretch}.purchase-view-switch button{flex:1}.purchase-card{grid-template-columns:1fr;grid-template-rows:190px auto;gap:12px;padding:8px}.purchase-card__media{min-height:0}.purchase-card__body{padding:2px 4px 4px}.purchase-card__store{max-width:62%}}

/* Unified responsive layout */
.purchases-page {
  width: min(100%, 1120px);
  gap: 14px;
}

.purchases-hero,
.link-import,
.purchases-toolbar,
.purchases-empty,
.purchase-card,
.purchase-table-wrap {
  border-radius: var(--radius-xl);
  box-shadow: none;
}

.purchases-hero {
  grid-template-columns: minmax(0, 1fr) minmax(320px, auto);
  gap: 18px;
  padding: 20px;
}

.purchases-hero__art {
  display: none;
}

.purchases-hero__stats {
  grid-template-columns: repeat(3, minmax(90px, 1fr));
}

.purchases-hero__stats article {
  min-width: 0;
  padding: 10px 11px;
}

.purchases-hero__stats strong {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
}

.link-import {
  grid-template-columns: 42px minmax(180px, .8fr) minmax(250px, 1.2fr) auto;
  gap: 10px;
  padding: 12px;
}

.link-import__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.link-import__manual {
  grid-column: 3 / -1;
}

.purchases-toolbar {
  grid-template-columns: minmax(210px, 1fr) repeat(3, minmax(130px, .52fr)) auto;
  gap: 8px;
  padding: 10px;
}

.purchase-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.purchase-card {
  grid-template-columns: 168px minmax(0, 1fr);
  grid-template-rows: minmax(220px, auto);
  gap: 14px;
  padding: 9px;
}

.purchase-card__media {
  min-height: 202px;
  border-radius: 13px;
}

.purchase-card__body {
  gap: 8px;
  padding: 4px 4px 4px 0;
}

.purchase-card__price strong {
  font-size: 20px;
}

@media (max-width: 1100px) {
  .purchases-page {
    width: 100%;
    padding: 12px;
  }

  .purchases-hero {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .purchases-hero__stats {
    display: grid;
    overflow: visible;
  }

  .link-import {
    grid-template-columns: 42px minmax(0, 1fr) auto;
  }

  .link-import__copy {
    grid-column: 2 / -1;
  }

  .link-import > .ui-input {
    grid-column: 1 / 3;
  }

  .link-import > .ui-button {
    grid-column: 3;
  }

  .link-import__manual {
    grid-column: 1 / -1;
  }

  .purchases-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .purchases-toolbar > .ui-input {
    grid-column: 1 / -1;
  }

  .purchase-view-switch {
    justify-self: stretch;
  }

  .purchase-view-switch button {
    flex: 1;
  }

  .purchase-grid {
    grid-template-columns: 1fr;
  }

  .purchase-card {
    grid-template-columns: 180px minmax(0, 1fr);
    grid-template-rows: minmax(214px, auto);
  }

  .purchase-card__media {
    min-height: 196px;
  }
}

@media (max-width: 700px) {
  .purchases-page {
    gap: 10px;
    padding: 10px;
  }

  .purchases-hero {
    gap: 12px;
    padding: 14px;
  }

  .purchases-hero p {
    line-height: 1.45;
  }

  .purchases-hero__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  .purchases-hero__stats article {
    min-width: 0;
    padding: 8px;
  }

  .purchases-hero__stats small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .purchases-hero__stats strong {
    font-size: 13px;
  }

  .link-import {
    grid-template-columns: 36px minmax(0, 1fr);
    padding: 11px;
  }

  .link-import__icon {
    width: 36px;
    height: 36px;
  }

  .link-import__copy {
    grid-column: 2;
  }

  .link-import > .ui-input,
  .link-import > .ui-button,
  .link-import__manual {
    grid-column: 1 / -1;
  }

  .link-import > .ui-button {
    width: 100%;
  }

  .link-import__manual {
    justify-self: center;
  }

  .purchases-toolbar {
    grid-template-columns: 1fr;
  }

  .purchases-toolbar > .ui-input,
  .purchase-view-switch {
    grid-column: 1;
  }

  .purchase-card {
    grid-template-columns: 1fr;
    grid-template-rows: 180px auto;
    gap: 10px;
    padding: 8px;
  }

  .purchase-card__media {
    min-height: 0;
  }

  .purchase-card__body {
    padding: 2px 4px 5px;
  }

  .purchase-card footer {
    align-items: flex-end;
  }
}

@media (max-width: 420px) {
  .purchases-hero__stats {
    grid-template-columns: 1fr 1fr;
  }

  .purchases-hero__stats article:nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .purchase-card footer {
    align-items: stretch;
    flex-direction: column;
  }

  .purchase-card footer > div {
    justify-content: flex-end;
  }
}
</style>
