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
        <div class="coupon-form__section-title"><label>Тип кода</label><div class="coupon-form__photo-actions"><button type="button" class="scan-button scan-button--camera" :disabled="isPhotoAnalyzing" @click="isQrScannerOpen = true"><UiIcon name="camera" /> Сканировать камерой</button><button type="button" class="scan-button" :disabled="isPhotoAnalyzing" @click="openPhotoPicker('all')"><UiIcon name="download" /> Все поля по фото</button><button type="button" class="scan-button" :disabled="isPhotoAnalyzing" @click="openPhotoPicker('codes')"><UiIcon name="barcode" /> Только QR/штрихкод</button><input ref="fileInput" type="file" accept="image/*" hidden @change="scanImage" /></div></div>
        <div class="code-types">
          <button v-for="item in codeTypes" :key="item.value" type="button" :class="{ active: form.codeType === item.value }" @click="form.codeType = item.value"><UiIcon :name="item.icon" /><span>{{ item.label }}</span></button>
        </div>
        <div v-if="form.codeType === 'barcode'" class="coupon-form__barcodes">
          <div class="coupon-form__grid coupon-form__grid--code">
            <UiInput v-model="form.codeValue" label="Верхний штрихкод" placeholder="Введите или распознайте значение" required />
            <div class="select-field"><span>Формат</span><UiSelect v-model="form.barcodeFormat" aria-label="Формат верхнего штрихкода"><option value="code128">Code 128</option><option value="ean13">EAN-13</option><option value="ean8">EAN-8</option><option value="upca">UPC-A</option></UiSelect></div>
          </div>
          <div class="coupon-form__grid coupon-form__grid--code">
            <UiInput v-model="form.secondaryCodeValue" label="Нижний штрихкод" placeholder="Необязательно" />
            <div class="select-field"><span>Формат</span><UiSelect v-model="form.secondaryBarcodeFormat" aria-label="Формат нижнего штрихкода"><option value="code128">Code 128</option><option value="ean13">EAN-13</option><option value="ean8">EAN-8</option><option value="upca">UPC-A</option></UiSelect></div>
          </div>
        </div>
        <div v-else-if="form.codeType !== 'none'" class="coupon-form__grid">
          <UiInput v-model="form.codeValue" :label="form.codeType === 'promo' ? 'Промокод' : 'Содержимое кода'" placeholder="Введите или отсканируйте значение" required />
        </div>
        <p v-if="isPhotoAnalyzing && scanMessage" class="scan-message">{{ scanMessage }}</p>
      </section>

      <UiInput v-model="form.expiresOn" type="date" label="Действует до" />
      <details ref="detailsRef" class="coupon-form__details">
        <summary>Описание, условия и оформление</summary>
        <label class="color-field"><span>Цвет маркера</span><div><button v-for="color in colors" :key="color" type="button" :class="{ active: form.color === color }" :style="{ background: color }" @click="form.color = color" /></div></label>
        <UiInput v-model="form.description" type="textarea" label="Описание" placeholder="Что даёт купон" />
        <UiInput v-model="form.terms" type="textarea" label="Условия использования" placeholder="Минимальная сумма, категории, ограничения" />
      </details>
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
import UiSelect from '../../../components/ui/UiSelect.vue'
import { useNotification } from '../../../composables/ui/useNotification'
import type { Coupon, CouponBarcodeFormat, CouponCodeType, CouponDiscountType, CouponPayload } from '../../../types/coupon'
import { decodeCouponCodeImage, type DecodedCouponCode } from '../services/couponCodeImage.service'
import { analyzeCouponPhoto } from '../services/couponPhotoAnalysis.service'
import { canAutofillCouponField } from '../utils/couponPhotoAutofill'
import type { ParsedCouponPhoto } from '../utils/couponPhotoParser'
import CouponMerchantInput from './CouponMerchantInput.vue'

const CouponQrScannerModal = defineAsyncComponent(() => import('./CouponQrScannerModal.vue'))

const props = withDefaults(defineProps<{ modelValue: boolean; coupon: Coupon | null; merchants?: string[] }>(), { merchants: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: CouponPayload] }>()
const colors = ['#7c8cf8', '#38bdf8', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#ec4899']
const discountTypes: Array<{ value: CouponDiscountType; label: string }> = [{ value: 'percent', label: 'Процент' }, { value: 'amount', label: 'Сумма' }, { value: 'text', label: 'Предложение' }]
const codeTypes: Array<{ value: CouponCodeType; label: string; icon: string }> = [{ value: 'qr', label: 'QR-код', icon: 'grid' }, { value: 'barcode', label: 'Штрихкод', icon: 'barcode' }, { value: 'promo', label: 'Промокод', icon: 'copy' }, { value: 'none', label: 'Без кода', icon: 'minus' }]
const fileInput = ref<HTMLInputElement | null>(null)
const detailsRef = ref<HTMLDetailsElement | null>(null)
const scanMessage = ref('')
const isPhotoAnalyzing = ref(false)
const isQrScannerOpen = ref(false)
const form = reactive<CouponPayload>(emptyForm())
const initialForm = ref<CouponPayload>(emptyForm())
const photoImportMode = ref<'all' | 'codes'>('all')
const { notify } = useNotification()

watch(() => [props.modelValue, props.coupon] as const, ([open, coupon]) => {
  if (!open) return
  Object.assign(form, coupon ? { title: coupon.title, merchant: coupon.merchant, description: coupon.description, discountType: coupon.discountType, discountValue: coupon.discountValue, discountLabel: coupon.discountLabel, codeType: coupon.codeType, codeValue: coupon.codeValue, barcodeFormat: coupon.barcodeFormat, secondaryCodeValue: coupon.secondaryCodeValue || '', secondaryBarcodeFormat: coupon.secondaryBarcodeFormat || 'code128', expiresOn: coupon.expiresOn, terms: coupon.terms, color: coupon.color, isUsed: coupon.isUsed } : emptyForm())
  initialForm.value = { ...form }
  scanMessage.value = ''; isQrScannerOpen.value = false
}, { immediate: true })

function emptyForm(): CouponPayload { return { title: '', merchant: '', description: '', discountType: 'percent', discountValue: 10, discountLabel: '', codeType: 'qr', codeValue: '', barcodeFormat: 'code128', secondaryCodeValue: '', secondaryBarcodeFormat: 'code128', expiresOn: '', terms: '', color: '#7c8cf8', isUsed: false } }
function submit() {
  if (!form.title.trim()) return void notify('Укажи название купона', 'danger')
  if (form.codeType !== 'none' && !form.codeValue.trim()) return void notify('Введи значение кода или считай его с фотографии', 'danger')
  const barcodeError = form.codeType === 'barcode' ? validateBarcode(form.codeValue, form.barcodeFormat) : ''
  if (barcodeError) return void notify(barcodeError, 'danger')
  const secondaryBarcodeError = form.codeType === 'barcode' && form.secondaryCodeValue.trim() ? validateBarcode(form.secondaryCodeValue, form.secondaryBarcodeFormat) : ''
  if (secondaryBarcodeError) return void notify(`Нижний штрихкод: ${secondaryBarcodeError}`, 'danger')
  emit('save', { ...form, title: form.title.trim(), merchant: form.merchant.trim(), codeValue: form.codeValue.trim(), secondaryCodeValue: form.codeType === 'barcode' ? form.secondaryCodeValue.trim() : '', discountValue: Math.max(0, Number(form.discountValue) || 0) })
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
  const mode = photoImportMode.value
  scanMessage.value = mode === 'all' ? 'Подготавливаю фотографию…' : 'Ищу QR-коды и штрихкоды…'
  isPhotoAnalyzing.value = true
  try {
    if (mode === 'codes') {
      const result = await decodeCouponCodeImage(file)
      const applied = applyDetectedCodes(result.codes)
      const protectedNotice = applied.skipped ? ` Сохранено без изменений: ${applied.skipped}.` : ''
      notify(`Найдено кодов: ${result.codes.length}, добавлено: ${applied.filled}.${protectedNotice}`, applied.filled ? 'success' : 'warning', { duration: 6200 })
      return
    }
    const result = await analyzeCouponPhoto(file, ({ message }) => { scanMessage.value = message })
    const appliedCodes = applyDetectedCodes(result.codes)
    const appliedFields = applyParsedFields(result.fields)
    const discountWarning = !result.fields.discountType ? 'Скидку не удалось прочитать — укажи её вручную.' : ''
    const notices = [result.warning, discountWarning].filter(Boolean)
    const skipped = appliedCodes.skipped + appliedFields.skipped
    const protectedNotice = skipped ? ` Ваши заполненные поля не изменены: ${skipped}.` : ''
    const message = `Фото обработано: добавлено кодов — ${appliedCodes.filled}, заполнено полей — ${appliedFields.filled}.${protectedNotice} ${notices.length ? notices.join(' ') : 'Проверь данные перед сохранением.'}`
    notify(message, notices.length ? 'warning' : 'success', { duration: 7200 })
  } catch (reason) {
    notify(reason instanceof Error ? reason.message : 'Не удалось распознать код на фото', 'danger', { duration: 6500 })
  } finally {
    isPhotoAnalyzing.value = false
    scanMessage.value = ''
  }
}
function openPhotoPicker(mode: 'all' | 'codes') {
  photoImportMode.value = mode
  fileInput.value?.click()
}
function canFill(field: keyof CouponPayload) {
  return canAutofillCouponField(field, form, initialForm.value, !props.coupon)
}
function applyDetectedCodes(codes: DecodedCouponCode[]): { filled: number; skipped: number } {
  const barcodes = codes.filter((code) => code.codeType === 'barcode')
  const qrCode = codes.find((code) => code.codeType === 'qr')
  const primary = barcodes[0] || qrCode
  if (!primary) return { filled: 0, skipped: 0 }

  const canUseType = form.codeType === primary.codeType || canFill('codeType')
  let filled = 0
  let skipped = 0
  if (canUseType && canFill('codeValue')) {
    form.codeType = primary.codeType
    form.codeValue = primary.value
    if (primary.codeType === 'barcode') form.barcodeFormat = primary.barcodeFormat
    filled += 1
  } else {
    skipped += 1
  }

  if (barcodes.length > 1) {
    if (form.codeType === 'barcode' && canFill('secondaryCodeValue')) {
      const secondary = barcodes.find((code) => code.value !== form.codeValue)
      if (secondary) {
        form.secondaryCodeValue = secondary.value
        form.secondaryBarcodeFormat = secondary.barcodeFormat
        filled += 1
      }
    } else {
      skipped += 1
    }
  }
  return { filled, skipped }
}
function applyParsedFields(fields: ParsedCouponPhoto): { filled: number; skipped: number } {
  let filled = 0
  let skipped = 0
  const apply = <K extends keyof CouponPayload>(field: K, value: CouponPayload[K] | undefined, assign: () => void) => {
    if (value === undefined || value === '') return
    if (canFill(field)) { assign(); filled += 1 } else skipped += 1
  }
  apply('title', fields.title, () => { form.title = fields.title || '' })
  apply('merchant', fields.merchant, () => { form.merchant = fields.merchant || '' })
  apply('description', fields.description, () => { form.description = fields.description || '' })
  apply('terms', fields.terms, () => { form.terms = fields.terms || '' })
  apply('expiresOn', fields.expiresOn, () => { form.expiresOn = fields.expiresOn || '' })
  if (fields.discountType) {
    const canFillDiscount = canFill('discountType') && canFill('discountValue') && canFill('discountLabel')
    if (canFillDiscount) {
      form.discountType = fields.discountType
      form.discountValue = fields.discountValue ?? 0
      form.discountLabel = fields.discountLabel || ''
      filled += 1
    } else {
      skipped += 1
    }
  }
  if ((fields.description && form.description === fields.description) || (fields.terms && form.terms === fields.terms)) detailsRef.value && (detailsRef.value.open = true)
  return { filled, skipped }
}
function applyScannedQr(value: string) { form.codeType = 'qr'; form.codeValue = value; notify('QR-код считан и добавлен', 'success') }
</script>

<style scoped>
.coupon-form { display: grid; gap: 16px; }.coupon-form__grid { display: grid; gap: 10px; }.coupon-form__grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }.coupon-form__grid--code { grid-template-columns: minmax(0, 1fr) 180px; }.coupon-form__barcodes { display: grid; gap: 10px; }.coupon-form__section { display: grid; gap: 9px; }.coupon-form__section > label, .coupon-form__section-title > label, .select-field > span, .color-field > span { color: var(--text-secondary); font-size: 11px; font-weight: 700; }.coupon-form__section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.coupon-form__photo-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }.choice-row, .code-types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }.choice-row button, .code-types button { min-height: 36px; border: 1px solid var(--border-color); border-radius: 9px; color: var(--text-secondary); background: var(--control-bg); font-size: 9px; }.choice-row button.active, .code-types button.active { border-color: var(--border-strong); color: var(--text-primary); background: var(--control-bg-hover); }.code-types { grid-template-columns: repeat(4, 1fr); }.code-types button { display: flex; align-items: center; justify-content: center; gap: 6px; }.scan-button { display: inline-flex; align-items: center; gap: 5px; border: 0; padding: 0; color: var(--text-muted); background: transparent; font-size: 9px; }.scan-button:disabled { opacity: .55; cursor: wait; }.scan-button--camera { color: var(--text-secondary); font-weight: 700; }.scan-message { margin: 0; color: var(--text-muted); font-size: 9px; }.select-field, .color-field { display: grid; gap: 5px; }.select-field :deep(.ui-select__trigger) { min-height: 36px; border-radius: var(--radius-md); }.color-field > div { min-height: 36px; display: flex; align-items: center; gap: 7px; }.color-field button { width: 20px; height: 20px; border: 2px solid transparent; border-radius: 50%; }.color-field button.active { border-color: var(--text-primary); box-shadow: 0 0 0 2px var(--panel-bg) inset; }.coupon-form__details { display: grid; gap: 10px; border-top: 1px solid var(--border-color); padding-top: 11px; }.coupon-form__details summary { color: var(--text-secondary); font-size: 10px; font-weight: 700; cursor: pointer; }.coupon-form__details[open] summary { margin-bottom: 2px; }.coupon-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 13px; }
@media (max-width: 600px) { .coupon-form__grid--two, .coupon-form__grid--code { grid-template-columns: 1fr; }.coupon-form__section-title { align-items: flex-start; flex-direction: column; }.code-types { grid-template-columns: repeat(2, 1fr); } }
</style>
