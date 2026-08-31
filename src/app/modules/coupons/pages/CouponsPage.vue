<template>
  <section class="coupons-page">
    <UiPageHeader title="Купоны" description="Промокоды, QR-коды и штрихкоды в одном месте.">
      <template #actions><UiButton icon="plus" @click="openEditor()">Добавить купон</UiButton></template>
    </UiPageHeader>

    <section class="coupon-controls panel">
      <div class="coupon-overview">
        <div><small>Доступно сейчас</small><strong>{{ availableCount }}</strong></div>
        <span v-if="expiringCount"><UiIcon name="clock" /> {{ expiringCount }} {{ expiringLabel }} скоро истекает</span>
        <span v-else>Срочных купонов нет</span>
      </div>
      <div class="coupon-toolbar">
        <label><UiIcon name="search" /><input v-model="search" type="search" placeholder="Поиск по магазину, названию или коду" /></label>
        <div><button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value">{{ item.label }} <span>{{ item.count }}</span></button></div>
      </div>
    </section>

    <div v-if="visibleCoupons.length" class="coupon-grid">
      <CouponCard v-for="coupon in visibleCoupons" :key="coupon.id" :coupon="coupon" :status="couponStatus(coupon)" @open="openCode(coupon)" @edit="openEditor(coupon)" @delete="confirmDelete(coupon)" />
    </div>

    <section v-else class="coupon-empty panel"><span><UiIcon :name="search ? 'search' : 'ticket'" /></span><h2>{{ search || filter !== 'all' ? 'Купоны не найдены' : 'Добавь первый купон' }}</h2><p>{{ search || filter !== 'all' ? 'Измени запрос или выбери другой фильтр.' : 'Сохрани QR-код, штрихкод или промокод — он будет доступен всей семье.' }}</p><UiButton v-if="!search && filter === 'all'" @click="openEditor()">Добавить купон</UiButton></section>

    <CouponModal v-if="isEditorOpen" v-model="isEditorOpen" :coupon="editingCoupon" :merchants="merchantOptions" @save="saveCoupon" />
    <CouponCodeModal v-if="isCodeOpen" v-model="isCodeOpen" :coupon="selectedCoupon" @edit="openEditorFromCode" @toggle-used="toggleUsed" />
    <UiConfirmModal v-model="isDeleteOpen" title="Удалить купон?" :message="`Купон «${deletingCoupon?.title || ''}» будет удалён для всей семьи.`" confirm-label="Удалить" @confirm="deleteCoupon" />
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiButton from '../../../components/ui/UiButton.vue'
import UiConfirmModal from '../../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { couponStore } from '../../../stores/coupon.store'
import type { Coupon, CouponPayload } from '../../../types/coupon'
import { pluralizeRu } from '../../../utils/formatters/pluralizeRu.js'
import CouponCard from '../components/CouponCard.vue'
import { getCouponStatus, type CouponStatus } from '../utils/couponExpiry'

const CouponCodeModal = defineAsyncComponent(() => import('../components/CouponCodeModal.vue'))
const CouponModal = defineAsyncComponent(() => import('../components/CouponModal.vue'))

type CouponFilter = 'all' | 'active' | 'expiring' | 'used' | 'expired'
const { notify } = useNotification()
const route = useRoute()
const coupons = couponStore.items
const search = ref('')
const filter = ref<CouponFilter>('all')
const isEditorOpen = ref(false)
const isCodeOpen = ref(false)
const isDeleteOpen = ref(false)
const editingCoupon = ref<Coupon | null>(null)
const selectedCoupon = ref<Coupon | null>(null)
const deletingCoupon = ref<Coupon | null>(null)
const handledCouponId = ref('')
const activeCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'active').length)
const expiringCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'expiring').length)
const availableCount = computed(() => activeCount.value + expiringCount.value)
const usedCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'used').length)
const expiringLabel = computed(() => pluralizeRu(expiringCount.value, ['купон', 'купона', 'купонов']))
const merchantOptions = computed(() => Array.from(new Map(coupons.value
  .map((coupon) => coupon.merchant.trim())
  .filter(Boolean)
  .map((merchant) => [merchant.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е'), merchant])).values())
  .sort((left, right) => left.localeCompare(right, 'ru-RU')))
const filters = computed(() => [
  { value: 'all' as const, label: 'Все', count: coupons.value.length },
  { value: 'active' as const, label: 'Активные', count: activeCount.value },
  { value: 'expiring' as const, label: 'Скоро истекут', count: expiringCount.value },
  { value: 'used' as const, label: 'Использованы', count: usedCount.value },
  { value: 'expired' as const, label: 'Истекли', count: coupons.value.filter((coupon) => couponStatus(coupon) === 'expired').length },
])
const visibleCoupons = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  return coupons.value.filter((coupon) => (filter.value === 'all' || couponStatus(coupon) === filter.value)
    && (!query || [coupon.title, coupon.merchant, coupon.description, coupon.codeValue, coupon.secondaryCodeValue].join(' ').toLocaleLowerCase('ru-RU').includes(query)))
})

watch([coupons, () => route.query.coupon], ([items, couponId]) => {
  if (typeof couponId !== 'string' || handledCouponId.value === couponId) return
  const coupon = items.find((item) => item.id === couponId)
  if (!coupon) return
  handledCouponId.value = couponId
  openCode(coupon)
}, { immediate: true })

function openEditor(coupon: Coupon | null = null) { editingCoupon.value = coupon; isEditorOpen.value = true }
function openCode(coupon: Coupon) { selectedCoupon.value = coupon; isCodeOpen.value = true }
function openEditorFromCode(coupon: Coupon) { isCodeOpen.value = false; openEditor(coupon) }
function confirmDelete(coupon: Coupon) { deletingCoupon.value = coupon; isDeleteOpen.value = true }
async function saveCoupon(payload: CouponPayload) { const result = editingCoupon.value ? await couponStore.update(editingCoupon.value.id, payload) : await couponStore.create(payload); if (!result.ok) return notify(result.message, 'danger'); isEditorOpen.value = false; notify(editingCoupon.value ? 'Купон обновлён' : 'Купон добавлен', 'success') }
async function toggleUsed(coupon: Coupon) { const result = await couponStore.update(coupon.id, { isUsed: !coupon.isUsed }); if (!result.ok) return notify(result.message, 'danger'); selectedCoupon.value = { ...coupon, isUsed: !coupon.isUsed, updatedAt: new Date().toISOString() }; notify(coupon.isUsed ? 'Купон снова активен' : 'Купон использован', 'success') }
async function deleteCoupon() { const coupon = deletingCoupon.value; if (!coupon) return; const result = await couponStore.remove(coupon.id); if (!result.ok) return notify(result.message, 'danger'); isDeleteOpen.value = false; deletingCoupon.value = null; notify('Купон удалён', 'info', { duration: 8000, actionLabel: 'Вернуть', action: async () => { const restored = await couponStore.restore(coupon); notify(restored.ok ? 'Купон восстановлен' : restored.message, restored.ok ? 'success' : 'danger') } }) }
function couponStatus(coupon: Coupon): CouponStatus { return getCouponStatus(coupon) }
</script>

<style scoped>
.coupons-page{display:grid;gap:12px;padding:2px}.coupon-controls{display:grid;gap:10px;padding:12px}.coupon-overview{display:flex;align-items:center;gap:14px;padding:2px 3px 11px;border-bottom:1px solid var(--border-color)}.coupon-overview>div{display:flex;align-items:baseline;gap:7px}.coupon-overview small{color:var(--text-muted);font-size:9px}.coupon-overview strong{font-size:19px}.coupon-overview>span{display:inline-flex;align-items:center;gap:5px;color:var(--text-muted);font-size:9px}.coupon-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}.coupon-toolbar>label{width:min(100%,390px);height:35px;display:grid;grid-template-columns:18px 1fr;align-items:center;gap:7px;border:1px solid var(--border-color);border-radius:9px;padding:0 10px;color:var(--text-muted);background:var(--field-bg)}.coupon-toolbar input{min-width:0;border:0;color:var(--text-primary);background:transparent;outline:0;font:inherit;font-size:10px}.coupon-toolbar>div{display:flex;gap:3px;overflow-x:auto}.coupon-toolbar>div button{border:0;border-radius:7px;padding:7px 9px;color:var(--text-muted);background:transparent;font-size:8px;white-space:nowrap}.coupon-toolbar>div button.active{color:var(--text-primary);background:var(--control-bg)}.coupon-toolbar button span{margin-left:3px;opacity:.6}.coupon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,310px),1fr));gap:10px}.coupon-empty{min-height:360px;display:grid;justify-items:center;align-content:center;gap:9px;padding:30px;text-align:center}.coupon-empty>span{width:48px;height:48px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:13px;color:var(--text-secondary);background:var(--control-bg);font-size:20px}.coupon-empty h2,.coupon-empty p{margin:0}.coupon-empty p{max-width:430px;margin-bottom:5px;color:var(--text-muted);font-size:10px;line-height:1.5}
@media(max-width:700px){.coupon-toolbar{align-items:stretch;flex-direction:column}.coupon-toolbar>label{width:100%}.coupon-overview{align-items:flex-start;flex-direction:column;gap:5px}}
</style>
