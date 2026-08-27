<template>
  <section class="coupons-page">
    <UiPageHeader title="Купоны" eyebrow="Скидки всегда под рукой" description="Промокоды, QR-коды и штрихкоды для всей семьи.">
      <template #actions><UiButton icon="plus" @click="openEditor()">Добавить купон</UiButton></template>
    </UiPageHeader>

    <section class="coupon-summary">
      <article><span><UiIcon name="ticket" /></span><div><small>Доступно</small><strong>{{ activeCount }}</strong></div></article>
      <article><span><UiIcon name="clock" /></span><div><small>Скоро истекут</small><strong>{{ expiringCount }}</strong></div></article>
      <article><span><UiIcon name="check" /></span><div><small>Использовано</small><strong>{{ usedCount }}</strong></div></article>
    </section>

    <section class="coupon-toolbar panel">
      <label><UiIcon name="search" /><input v-model="search" type="search" placeholder="Найти магазин или купон" /></label>
      <div><button v-for="item in filters" :key="item.value" type="button" :class="{ active: filter === item.value }" @click="filter = item.value">{{ item.label }} <span>{{ item.count }}</span></button></div>
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
import { computed, defineAsyncComponent, ref } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiConfirmModal from '../../../components/ui/UiConfirmModal.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiPageHeader from '../../../components/ui/UiPageHeader.vue'
import { useNotification } from '../../../composables/ui/useNotification.js'
import { couponStore } from '../../../stores/coupon.store'
import type { Coupon, CouponPayload } from '../../../types/coupon'
import CouponCard from '../components/CouponCard.vue'

const CouponCodeModal = defineAsyncComponent(() => import('../components/CouponCodeModal.vue'))
const CouponModal = defineAsyncComponent(() => import('../components/CouponModal.vue'))

type CouponFilter = 'all' | 'active' | 'expiring' | 'used' | 'expired'
type CouponStatus = Exclude<CouponFilter, 'all'>
const { notify } = useNotification()
const coupons = couponStore.items
const search = ref('')
const filter = ref<CouponFilter>('all')
const isEditorOpen = ref(false)
const isCodeOpen = ref(false)
const isDeleteOpen = ref(false)
const editingCoupon = ref<Coupon | null>(null)
const selectedCoupon = ref<Coupon | null>(null)
const deletingCoupon = ref<Coupon | null>(null)
const activeCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'active').length)
const expiringCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'expiring').length)
const usedCount = computed(() => coupons.value.filter((coupon) => couponStatus(coupon) === 'used').length)
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
    && (!query || [coupon.title, coupon.merchant, coupon.description, coupon.codeValue].join(' ').toLocaleLowerCase('ru-RU').includes(query)))
})

function openEditor(coupon: Coupon | null = null) { editingCoupon.value = coupon; isEditorOpen.value = true }
function openCode(coupon: Coupon) { selectedCoupon.value = coupon; isCodeOpen.value = true }
function openEditorFromCode(coupon: Coupon) { isCodeOpen.value = false; openEditor(coupon) }
function confirmDelete(coupon: Coupon) { deletingCoupon.value = coupon; isDeleteOpen.value = true }
async function saveCoupon(payload: CouponPayload) { const result = editingCoupon.value ? await couponStore.update(editingCoupon.value.id, payload) : await couponStore.create(payload); if (!result.ok) return notify(result.message, 'danger'); isEditorOpen.value = false; notify(editingCoupon.value ? 'Купон обновлён' : 'Купон добавлен', 'success') }
async function toggleUsed(coupon: Coupon) { const result = await couponStore.update(coupon.id, { isUsed: !coupon.isUsed }); if (!result.ok) return notify(result.message, 'danger'); selectedCoupon.value = { ...coupon, isUsed: !coupon.isUsed, updatedAt: new Date().toISOString() }; notify(coupon.isUsed ? 'Купон снова активен' : 'Купон использован', 'success') }
async function deleteCoupon() { if (!deletingCoupon.value) return; const result = await couponStore.remove(deletingCoupon.value.id); if (!result.ok) return notify(result.message, 'danger'); isDeleteOpen.value = false; notify('Купон удалён', 'info') }
function couponStatus(coupon: Coupon): CouponStatus { if (coupon.isUsed) return 'used'; if (!coupon.expiresOn) return 'active'; const days = Math.ceil((new Date(`${coupon.expiresOn}T23:59:59`).getTime() - Date.now()) / 86_400_000); if (days < 0) return 'expired'; return days <= 7 ? 'expiring' : 'active' }
</script>

<style scoped>
.coupons-page { display: grid; gap: 12px; padding: 2px; }.coupon-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.coupon-summary article { display: flex; align-items: center; gap: 11px; border: 1px solid var(--border-color); border-radius: 13px; padding: 13px 15px; background: var(--panel-bg); }.coupon-summary article > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: var(--accent-soft); }.coupon-summary article > div { display: grid; gap: 3px; }.coupon-summary small { color: var(--text-muted); font-size: 8px; }.coupon-summary strong { font-size: 18px; }.coupon-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px; }.coupon-toolbar > label { width: min(100%, 360px); height: 34px; display: grid; grid-template-columns: 18px 1fr; align-items: center; gap: 7px; border: 1px solid var(--border-color); border-radius: 9px; padding: 0 10px; color: var(--text-muted); background: var(--field-bg); }.coupon-toolbar input { min-width: 0; border: 0; color: var(--text-primary); background: transparent; outline: 0; font: inherit; font-size: 10px; }.coupon-toolbar > div { display: flex; gap: 3px; overflow-x: auto; }.coupon-toolbar > div button { border: 0; border-radius: 7px; padding: 7px 9px; color: var(--text-muted); background: transparent; font-size: 8px; white-space: nowrap; }.coupon-toolbar > div button.active { color: var(--text-primary); background: var(--control-bg); }.coupon-toolbar button span { margin-left: 3px; opacity: .6; }.coupon-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.coupon-card { position: relative; min-width: 0; display: grid; gap: 13px; overflow: hidden; border-top: 3px solid var(--coupon-color); padding: 14px; cursor: pointer; transition: .18s var(--ease-out); }.coupon-card:hover { border-color: var(--coupon-color); transform: translateY(-2px); box-shadow: var(--shadow-md); }.coupon-card--muted { opacity: .64; }.coupon-card > header, .coupon-card > footer, .coupon-card__code { display: flex; align-items: center; justify-content: space-between; gap: 9px; }.coupon-card__merchant { overflow: hidden; color: var(--text-secondary); font-size: 9px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__status { border-radius: 999px; padding: 4px 7px; color: var(--success); background: color-mix(in srgb, var(--success) 9%, transparent); font-size: 7px; font-weight: 700; }.coupon-card__status[data-status='expiring'] { color: var(--warning); background: color-mix(in srgb, var(--warning) 9%, transparent); }.coupon-card__status[data-status='expired'], .coupon-card__status[data-status='used'] { color: var(--text-muted); background: var(--control-bg); }.coupon-card__body { min-height: 100px; display: grid; align-content: start; gap: 6px; }.coupon-card__discount { width: max-content; max-width: 100%; overflow: hidden; border-radius: 8px; padding: 5px 8px; color: var(--coupon-color); background: color-mix(in srgb, var(--coupon-color) 10%, transparent); font-size: 17px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }.coupon-card h2, .coupon-card p { margin: 0; }.coupon-card h2 { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.coupon-card p { display: -webkit-box; overflow: hidden; color: var(--text-muted); font-size: 9px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.coupon-card__code { border: 1px dashed var(--border-color); border-radius: 9px; padding: 9px; background: var(--control-bg); }.coupon-card__code span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 8px; }.coupon-card__code strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.coupon-card > footer { border-top: 1px solid var(--border-color); padding-top: 10px; }.coupon-card > footer > span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: 8px; }.coupon-card > footer > span.warning { color: var(--warning); }.coupon-card > footer > span.danger { color: var(--danger); }.coupon-card > footer > div { display: flex; gap: 5px; }.coupon-card__open { display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 9px; padding: 9px; color: var(--text-primary); background: color-mix(in srgb, var(--coupon-color) 12%, var(--control-bg)); font-size: 9px; font-weight: 700; }.coupon-empty { min-height: 360px; display: grid; justify-items: center; align-content: center; gap: 9px; padding: 30px; text-align: center; }.coupon-empty > span { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: var(--accent); background: var(--accent-soft); font-size: 23px; }.coupon-empty h2, .coupon-empty p { margin: 0; }.coupon-empty p { max-width: 430px; margin-bottom: 5px; color: var(--text-muted); font-size: 10px; line-height: 1.5; }
@media (max-width: 1050px) { .coupon-grid { grid-template-columns: repeat(2, 1fr); } }.coupon-summary { grid-template-columns: repeat(3, 1fr); }
.coupon-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 14px; }
@media (max-width: 650px) { .coupon-summary, .coupon-grid { grid-template-columns: 1fr; }.coupon-toolbar { align-items: stretch; flex-direction: column; }.coupon-toolbar > label { width: 100%; } }
</style>
