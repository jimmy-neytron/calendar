<template>
  <UiModal :model-value="modelValue" :title="coupon?.title || 'Купон'" :eyebrow="coupon?.merchant || 'Покажи на кассе'" width="560px" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="coupon" class="coupon-code">
      <div class="coupon-code__discount" :style="{ '--coupon-color': coupon.color }"><small>Ваша скидка</small><strong>{{ discountText(coupon) }}</strong><span v-if="coupon.expiresOn">до {{ formatDate(coupon.expiresOn) }}</span></div>
      <div v-if="coupon.codeType === 'qr' || coupon.codeType === 'barcode'" class="coupon-code__canvas" :class="{ 'coupon-code__canvas--qr': coupon.codeType === 'qr' }"><canvas ref="canvas" /><p v-if="renderError">{{ renderError }}</p></div>
      <div v-else-if="coupon.codeType === 'promo'" class="coupon-code__promo"><small>Промокод</small><strong>{{ coupon.codeValue }}</strong></div>
      <div v-else class="coupon-code__empty"><UiIcon name="check" /><span>Для этого предложения код не требуется</span></div>
      <button v-if="coupon.codeValue" type="button" class="coupon-code__copy" @click="copyCode"><UiIcon :name="copied ? 'check' : 'copy'" /> {{ copied ? 'Скопировано' : 'Скопировать код' }}</button>
      <p v-if="coupon.terms" class="coupon-code__terms"><strong>Условия</strong>{{ coupon.terms }}</p>
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
function formatDate(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) }
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
.coupon-code { display: grid; justify-items: center; gap: 14px; }.coupon-code__discount { width: 100%; display: flex; align-items: baseline; justify-content: center; gap: 8px; border: 1px solid color-mix(in srgb, var(--coupon-color) 30%, var(--border-color)); border-radius: 13px; padding: 13px; background: color-mix(in srgb, var(--coupon-color) 10%, var(--control-bg)); }.coupon-code__discount small, .coupon-code__discount span { color: var(--text-muted); font-size: 9px; }.coupon-code__discount strong { color: var(--coupon-color); font-size: 24px; }.coupon-code__canvas { width: 100%; min-height: 190px; display: grid; place-items: center; overflow: auto; border-radius: 14px; padding: 24px; background: #fff; }.coupon-code__canvas--qr { width: min(100%, 360px); }.coupon-code__canvas canvas { display: block; max-width: 100%; height: auto; }.coupon-code__canvas p { color: #dc2626; font-size: 10px; }.coupon-code__promo { width: 100%; display: grid; justify-items: center; gap: 7px; border: 2px dashed var(--border-strong); border-radius: 14px; padding: 30px 16px; background: var(--control-bg); }.coupon-code__promo small { color: var(--text-muted); font-size: 9px; text-transform: uppercase; letter-spacing: .12em; }.coupon-code__promo strong { font-size: clamp(22px, 5vw, 34px); letter-spacing: .08em; overflow-wrap: anywhere; }.coupon-code__empty { min-height: 150px; display: grid; place-items: center; align-content: center; gap: 9px; color: var(--text-muted); font-size: 10px; }.coupon-code__empty :deep(svg) { color: var(--success); font-size: 28px; }.coupon-code__copy { display: inline-flex; align-items: center; gap: 6px; border: 0; padding: 4px; color: var(--accent); background: transparent; font-size: 10px; }.coupon-code__terms { width: 100%; display: grid; gap: 4px; margin: 0; border-top: 1px solid var(--border-color); padding-top: 12px; color: var(--text-muted); font-size: 9px; line-height: 1.5; }.coupon-code__terms strong { color: var(--text-secondary); }.coupon-code footer { width: 100%; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
</style>
