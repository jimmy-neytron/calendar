<template>
  <UiModal :model-value="modelValue" :title="coupon?.title || 'Купон'" :eyebrow="coupon?.merchant || 'Покажи на кассе'" width="520px" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="coupon" class="coupon-code">
      <div class="coupon-code__summary" :style="{ '--coupon-color': coupon.color }"><i /><div><small>Выгода</small><strong>{{ discountText(coupon) }}</strong></div><span :title="formatCouponExpiryDate(coupon.expiresOn)">{{ formatCouponExpiry(coupon.expiresOn) }}</span></div>
      <div v-if="coupon.codeType === 'qr' || coupon.codeType === 'barcode'" class="coupon-code__canvas" :class="{ 'coupon-code__canvas--qr': coupon.codeType === 'qr' }"><canvas ref="canvas" /><p v-if="renderError">{{ renderError }}</p></div>
      <div v-else-if="coupon.codeType === 'promo'" class="coupon-code__promo"><small>Промокод</small><strong>{{ coupon.codeValue }}</strong></div>
      <div v-else class="coupon-code__empty"><UiIcon name="check" /><span>Для этого предложения код не требуется</span></div>
      <button v-if="coupon.codeValue" type="button" class="coupon-code__copy" @click="copyCode"><UiIcon :name="copied ? 'check' : 'copy'" /> {{ copied ? 'Код скопирован' : 'Скопировать код' }}</button>
      <details v-if="coupon.terms" class="coupon-code__terms"><summary>Условия использования</summary><p>{{ coupon.terms }}</p></details>
      <footer><UiButton variant="secondary" @click="emit('edit', coupon)">Изменить</UiButton><UiButton :variant="coupon.isUsed ? 'secondary' : 'primary'" @click="emit('toggleUsed', coupon)">{{ coupon.isUsed ? 'Вернуть в активные' : 'Отметить использованным' }}</UiButton></footer>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { code128, ean13, ean8, qrcode, upca } from '@bwip-js/browser'
import { nextTick, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { Coupon } from '../../../types/coupon'
import { formatCouponExpiry, formatCouponExpiryDate } from '../utils/couponExpiry'

const props = defineProps<{ modelValue: boolean; coupon: Coupon | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; edit: [coupon: Coupon]; toggleUsed: [coupon: Coupon] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const renderError = ref('')
const copied = ref(false)

watch(() => [props.modelValue, props.coupon?.id, props.coupon?.updatedAt] as const, async ([open]) => {
  copied.value = false
  renderError.value = ''
  if (!open || !props.coupon || !['qr', 'barcode'].includes(props.coupon.codeType)) return
  await nextTick()
  if (!canvas.value) return
  try {
    if (props.coupon.codeType === 'qr') {
      qrcode(canvas.value, { bcid: 'qrcode', text: props.coupon.codeValue, scale: 5, padding: 3, backgroundcolor: 'ffffff' })
    } else {
      renderBarcode(canvas.value, props.coupon)
    }
  } catch (reason) {
    renderError.value = reason instanceof Error ? reason.message : 'Не удалось построить код'
  }
}, { immediate: true })

async function copyCode() {
  if (!props.coupon?.codeValue) return
  try { await navigator.clipboard.writeText(props.coupon.codeValue); copied.value = true } catch { copied.value = false }
}
function discountText(coupon: Coupon) { if (coupon.discountLabel) return coupon.discountLabel; if (coupon.discountType === 'percent') return `${coupon.discountValue}%`; if (coupon.discountType === 'amount') return `${new Intl.NumberFormat('ru-RU').format(coupon.discountValue)} ₽`; return 'Специальное предложение' }
function renderBarcode(target: HTMLCanvasElement, coupon: Coupon) {
  const options = { bcid: coupon.barcodeFormat, text: coupon.codeValue, scale: 3, height: 18, includetext: true, textxalign: 'center' as const, textsize: 10, padding: 4, backgroundcolor: 'ffffff' }
  const retailOptions = { ...options, height: 16, textsize: 9, textyoffset: -9, guarddescent: 2, paddingbottom: 10 }
  if (coupon.barcodeFormat === 'ean13') return ean13(target, retailOptions)
  if (coupon.barcodeFormat === 'ean8') return ean8(target, retailOptions)
  if (coupon.barcodeFormat === 'upca') return upca(target, retailOptions)
  return code128(target, options)
}
</script>

<style scoped>
.coupon-code{display:grid;justify-items:center;gap:12px}.coupon-code__summary{width:100%;display:grid;grid-template-columns:3px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid var(--border-color);border-radius:11px;padding:11px;background:var(--control-bg)}.coupon-code__summary>i{width:3px;height:31px;border-radius:3px;background:var(--coupon-color)}.coupon-code__summary>div{display:grid;gap:2px}.coupon-code__summary small,.coupon-code__summary>span{color:var(--text-muted);font-size:8px}.coupon-code__summary strong{font-size:17px}.coupon-code__canvas{width:100%;min-height:190px;display:grid;place-items:center;overflow:auto;border:1px solid #e5e7eb;border-radius:12px;padding:22px;background:#fff}.coupon-code__canvas--qr{width:min(100%,340px)}.coupon-code__canvas canvas{display:block;max-width:100%;height:auto}.coupon-code__canvas p{color:#dc2626;font-size:10px}.coupon-code__promo{width:100%;display:grid;justify-items:center;gap:7px;border:1px solid var(--border-color);border-radius:12px;padding:28px 16px;background:var(--control-bg)}.coupon-code__promo small{color:var(--text-muted);font-size:8px;text-transform:uppercase;letter-spacing:.1em}.coupon-code__promo strong{font-size:clamp(22px,5vw,31px);letter-spacing:.06em;overflow-wrap:anywhere}.coupon-code__empty{min-height:140px;display:grid;place-items:center;align-content:center;gap:9px;color:var(--text-muted);font-size:10px}.coupon-code__empty :deep(svg){color:var(--success);font-size:25px}.coupon-code__copy{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--border-color);border-radius:9px;padding:9px;color:var(--text-secondary);background:var(--control-bg);font-size:9px}.coupon-code__copy:hover{border-color:var(--border-strong);background:var(--control-bg-hover)}.coupon-code__terms{width:100%;border-top:1px solid var(--border-color);padding-top:11px;color:var(--text-muted);font-size:9px}.coupon-code__terms summary{color:var(--text-secondary);font-weight:700;cursor:pointer}.coupon-code__terms p{margin:7px 0 0;line-height:1.5}.coupon-code footer{width:100%;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:12px}
</style>
