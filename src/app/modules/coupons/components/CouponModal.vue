<template>
  <UiModal :model-value="modelValue" :title="coupon ? 'Изменить купон' : 'Новый купон'" eyebrow="Купоны и скидки" width="680px" @update:model-value="emit('update:modelValue', $event)">
    <form class="coupon-form" @submit.prevent="submit">
      <div class="coupon-form__grid coupon-form__grid--two">
        <UiInput v-model="form.title" label="Название" placeholder="Скидка на следующий заказ" required />
        <CouponMerchantInput v-model="form.merchant" :options="merchants" />
      </div>

      <section class="coupon-form__section">
        <label>Скидка</label>
        <div class="choice-row">
          <button v-for="item in discountTypes" :key="item.value" type="button" :class="{ active: form.discountType === item.value }" @click="form.discountType = item.value">{{ item.label }}</button>
        </div>
        <div class="coupon-form__grid coupon-form__grid--two">
          <UiInput v-if="form.discountType !== 'text'" v-model="form.discountValue" type="number" min="0" :max="form.discountType === 'percent' ? 100 : undefined" :label="form.discountType === 'percent' ? 'Размер скидки, %' : 'Размер скидки, ₽'" />
          <UiInput v-model="form.discountLabel" :label="form.discountType === 'text' ? 'Текст скидки' : 'Подпись'" :placeholder="form.discountType === 'text' ? 'Например: второй товар бесплатно' : 'Необязательно'" />
        </div>
      </section>

      <section class="coupon-form__section">
        <div class="coupon-form__section-title"><label>Тип кода</label><div><button type="button" class="scan-button scan-button--camera" @click="isQrScannerOpen = true"><UiIcon name="camera" /> Сканировать камерой</button><button type="button" class="scan-button" @click="fileInput?.click()"><UiIcon name="download" /> Загрузить фото</button><input ref="fileInput" type="file" accept="image/*" hidden @change="scanImage" /></div></div>
        <div class="code-types">
          <button v-for="item in codeTypes" :key="item.value" type="button" :class="{ active: form.codeType === item.value }" @click="form.codeType = item.value"><UiIcon :name="item.icon" /><span>{{ item.label }}</span></button>
        </div>
        <div v-if="form.codeType !== 'none'" class="coupon-form__grid" :class="{ 'coupon-form__grid--code': form.codeType === 'barcode' }">
          <UiInput v-model="form.codeValue" :label="form.codeType === 'promo' ? 'Промокод' : 'Содержимое кода'" placeholder="Введите или отсканируйте значение" required />
          <label v-if="form.codeType === 'barcode'" class="select-field"><span>Формат штрихкода</span><select v-model="form.barcodeFormat"><option value="code128">Code 128</option><option value="ean13">EAN-13</option><option value="ean8">EAN-8</option><option value="upca">UPC-A</option></select></label>
        </div>
        <p v-if="scanMessage" class="scan-message" :class="{ error: scanError }">{{ scanMessage }}</p>
      </section>

      <div class="coupon-form__grid coupon-form__grid--two">
        <UiInput v-model="form.expiresOn" type="date" label="Действует до" />
        <label class="color-field"><span>Цвет карточки</span><div><button v-for="color in colors" :key="color" type="button" :class="{ active: form.color === color }" :style="{ background: color }" @click="form.color = color" /></div></label>
      </div>
      <UiInput v-model="form.description" type="textarea" label="Описание" placeholder="Что даёт купон" />
      <UiInput v-model="form.terms" type="textarea" label="Условия использования" placeholder="Минимальная сумма, категории, ограничения" />
      <p v-if="error" class="coupon-form__error">{{ error }}</p>
      <footer><UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">{{ coupon ? 'Сохранить' : 'Добавить купон' }}</UiButton></footer>
    </form>
  </UiModal>
  <CouponQrScannerModal v-if="isQrScannerOpen" v-model="isQrScannerOpen" @scan="applyScannedQr" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, reactive, ref, watch } from 'vue'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'
import type { Coupon, CouponBarcodeFormat, CouponCodeType, CouponDiscountType, CouponPayload } from '../../../types/coupon'
import { decodeCouponCodeImage } from '../services/couponCodeImage.service'
import CouponMerchantInput from './CouponMerchantInput.vue'

const CouponQrScannerModal = defineAsyncComponent(() => import('./CouponQrScannerModal.vue'))

const props = withDefaults(defineProps<{ modelValue: boolean; coupon: Coupon | null; merchants?: string[] }>(), { merchants: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: CouponPayload] }>()
const colors = ['#7c8cf8', '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#ec4899']
const discountTypes: Array<{ value: CouponDiscountType; label: string }> = [{ value: 'percent', label: 'Процент' }, { value: 'amount', label: 'Сумма' }, { value: 'text', label: 'Предложение' }]
const codeTypes: Array<{ value: CouponCodeType; label: string; icon: string }> = [{ value: 'qr', label: 'QR-код', icon: 'grid' }, { value: 'barcode', label: 'Штрихкод', icon: 'barcode' }, { value: 'promo', label: 'Промокод', icon: 'copy' }, { value: 'none', label: 'Без кода', icon: 'minus' }]
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')
const scanMessage = ref('')
const scanError = ref(false)
const isQrScannerOpen = ref(false)
const form = reactive<CouponPayload>(emptyForm())

watch(() => [props.modelValue, props.coupon] as const, ([open, coupon]) => {
  if (!open) return
  Object.assign(form, coupon ? { title: coupon.title, merchant: coupon.merchant, description: coupon.description, discountType: coupon.discountType, discountValue: coupon.discountValue, discountLabel: coupon.discountLabel, codeType: coupon.codeType, codeValue: coupon.codeValue, barcodeFormat: coupon.barcodeFormat, expiresOn: coupon.expiresOn, terms: coupon.terms, color: coupon.color, isUsed: coupon.isUsed } : emptyForm())
  error.value = ''; scanMessage.value = ''; scanError.value = false; isQrScannerOpen.value = false
}, { immediate: true })

function emptyForm(): CouponPayload { return { title: '', merchant: '', description: '', discountType: 'percent', discountValue: 10, discountLabel: '', codeType: 'qr', codeValue: '', barcodeFormat: 'code128', expiresOn: '', terms: '', color: '#7c8cf8', isUsed: false } }
function submit() {
  error.value = ''
  if (!form.title.trim()) return void (error.value = 'Укажи название купона')
  if (form.codeType !== 'none' && !form.codeValue.trim()) return void (error.value = 'Введи значение кода или считай его с фотографии')
  const barcodeError = form.codeType === 'barcode' ? validateBarcode(form.codeValue, form.barcodeFormat) : ''
  if (barcodeError) return void (error.value = barcodeError)
  emit('save', { ...form, title: form.title.trim(), merchant: form.merchant.trim(), codeValue: form.codeValue.trim(), discountValue: Math.max(0, Number(form.discountValue) || 0) })
}
function validateBarcode(value: string, format: CouponBarcodeFormat) {
  const digits = value.trim()
  if (format === 'ean13' && !/^\d{12,13}$/.test(digits)) return 'Для EAN-13 нужно 12 или 13 цифр'
  if (format === 'ean8' && !/^\d{7,8}$/.test(digits)) return 'Для EAN-8 нужно 7 или 8 цифр'
  if (format === 'upca' && !/^\d{11,12}$/.test(digits)) return 'Для UPC-A нужно 11 или 12 цифр'
  return ''
}
async function scanImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  scanMessage.value = 'Распознаю код…'; scanError.value = false
  try {
    const result = await decodeCouponCodeImage(file)
    form.codeValue = result.value
    form.codeType = result.codeType
    form.barcodeFormat = result.barcodeFormat
    scanMessage.value = result.codeType === 'qr' ? 'QR-код распознан и добавлен' : 'Штрихкод распознан и добавлен'
  } catch (reason) {
    scanMessage.value = reason instanceof Error ? reason.message : 'Не удалось распознать код на фото'
    scanError.value = true
  }
}
function applyScannedQr(value: string) { form.codeType = 'qr'; form.codeValue = value; scanMessage.value = 'QR-код считан и добавлен'; scanError.value = false }
</script>

<style scoped>
.coupon-form { display: grid; gap: 16px; }.coupon-form__grid { display: grid; gap: 10px; }.coupon-form__grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }.coupon-form__grid--code { grid-template-columns: minmax(0, 1fr) 180px; }.coupon-form__section { display: grid; gap: 9px; }.coupon-form__section > label, .coupon-form__section-title > label, .select-field > span, .color-field > span { color: var(--text-secondary); font-size: 11px; font-weight: 700; }.coupon-form__section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.coupon-form__section-title > div { display: flex; align-items: center; gap: 10px; }.choice-row, .code-types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }.choice-row button, .code-types button { min-height: 36px; border: 1px solid var(--border-color); border-radius: 9px; color: var(--text-secondary); background: var(--control-bg); font-size: 9px; }.choice-row button.active, .code-types button.active { border-color: var(--accent-border); color: var(--text-primary); background: var(--accent-soft); }.code-types { grid-template-columns: repeat(4, 1fr); }.code-types button { display: flex; align-items: center; justify-content: center; gap: 6px; }.scan-button { display: inline-flex; align-items: center; gap: 5px; border: 0; padding: 0; color: var(--text-muted); background: transparent; font-size: 9px; }.scan-button--camera { color: var(--accent); font-weight: 700; }.scan-message { margin: 0; color: var(--success); font-size: 9px; }.scan-message.error, .coupon-form__error { color: var(--danger); }.select-field, .color-field { display: grid; gap: 5px; }.select-field select { min-height: 36px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0 10px; color: var(--text-primary); background: var(--field-bg); outline: none; }.color-field > div { min-height: 36px; display: flex; align-items: center; gap: 7px; }.color-field button { width: 23px; height: 23px; border: 2px solid transparent; border-radius: 50%; }.color-field button.active { border-color: var(--text-primary); box-shadow: 0 0 0 2px var(--panel-bg) inset; }.coupon-form__error { margin: 0; font-size: 10px; }.coupon-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 13px; }
@media (max-width: 600px) { .coupon-form__grid--two, .coupon-form__grid--code { grid-template-columns: 1fr; }.coupon-form__section-title { align-items: flex-start; flex-direction: column; }.code-types { grid-template-columns: repeat(2, 1fr); } }
</style>
