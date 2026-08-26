<template>
  <article class="coupon-card" :class="{ 'coupon-card--muted': status === 'used' || status === 'expired' }" :style="{ '--coupon-color': coupon.color }" @click="emit('open')">
    <span class="coupon-card__glow" aria-hidden="true" />
    <header class="coupon-card__header">
      <div class="coupon-card__identity">
        <span class="coupon-card__logo">{{ merchantInitial }}</span>
        <div><small>Купон от</small><strong>{{ coupon.merchant || 'Без магазина' }}</strong></div>
      </div>
      <span class="coupon-card__status" :data-status="status"><i />{{ statusLabel }}</span>
    </header>
    <div class="coupon-card__content">
      <div class="coupon-card__benefit"><small>Ваша выгода</small><strong>{{ discountText }}</strong></div>
      <div class="coupon-card__details"><h2>{{ coupon.title }}</h2><p>{{ coupon.description || coupon.terms || 'Все детали предложения находятся внутри купона.' }}</p></div>
    </div>
    <button type="button" class="coupon-card__pass" @click.stop="emit('open')">
      <span class="coupon-card__code-icon"><UiIcon :name="codeIcon" /></span>
      <span class="coupon-card__code-copy"><small>{{ codeTypeLabel }}</small><strong>{{ coupon.codeValue ? maskedCode : 'Код не требуется' }}</strong></span>
      <span class="coupon-card__show">{{ coupon.codeType === 'none' ? 'Условия' : 'Показать' }} <UiIcon name="right" /></span>
    </button>
    <footer class="coupon-card__footer">
      <span class="coupon-card__expiry" :class="{ danger: status === 'expired', warning: status === 'expiring' }"><UiIcon name="calendar" /><span><small>Срок действия</small><strong>{{ expiryLabel }}</strong></span></span>
      <div class="coupon-card__actions"><UiIconButton icon="edit" label="Изменить купон" size="sm" @click.stop="emit('edit')" /><UiIconButton icon="trash" label="Удалить купон" size="sm" variant="danger" @click.stop="emit('delete')" /></div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { Coupon } from '../../../types/coupon'

type CouponStatus = 'active' | 'expiring' | 'used' | 'expired'
const props = defineProps<{ coupon: Coupon; status: CouponStatus }>()
const emit = defineEmits<{ open: []; edit: []; delete: [] }>()
const merchantInitial = computed(() => (props.coupon.merchant || props.coupon.title || 'К').trim().charAt(0).toLocaleUpperCase('ru-RU'))
const statusLabel = computed(() => ({ active: 'Активен', expiring: 'Скоро истечёт', used: 'Использован', expired: 'Истёк' })[props.status])
const codeIcon = computed(() => ({ qr: 'grid', barcode: 'barcode', promo: 'copy', none: 'notes' })[props.coupon.codeType])
const codeTypeLabel = computed(() => ({ qr: 'QR-код', barcode: 'Штрихкод', promo: 'Промокод', none: 'Без кода' })[props.coupon.codeType])
const maskedCode = computed(() => props.coupon.codeValue.length <= 16 ? props.coupon.codeValue : `${props.coupon.codeValue.slice(0, 7)}…${props.coupon.codeValue.slice(-5)}`)
const discountText = computed(() => {
  if (props.coupon.discountLabel) return props.coupon.discountLabel
  if (props.coupon.discountType === 'percent') return `−${props.coupon.discountValue}%`
  if (props.coupon.discountType === 'amount') return `−${new Intl.NumberFormat('ru-RU').format(props.coupon.discountValue)} ₽`
  return 'Выгодное предложение'
})
const expiryLabel = computed(() => !props.coupon.expiresOn ? 'Без срока' : `до ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${props.coupon.expiresOn}T00:00:00`)).replace('.', '')}`)
</script>

<style scoped>
.coupon-card { position: relative; min-width: 0; display: grid; gap: 20px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--coupon-color) 22%, var(--border-color)); border-radius: 18px; padding: 20px; background: linear-gradient(145deg, color-mix(in srgb, var(--coupon-color) 6%, var(--panel-bg)) 0%, var(--panel-bg) 58%); box-shadow: 0 12px 35px rgb(0 0 0 / 10%); cursor: pointer; isolation: isolate; transition: transform .2s var(--ease-out), border-color .2s ease, box-shadow .2s ease; }
.coupon-card:hover { border-color: color-mix(in srgb, var(--coupon-color) 50%, var(--border-color)); transform: translateY(-3px); box-shadow: 0 18px 45px rgb(0 0 0 / 18%); }
.coupon-card--muted { filter: saturate(.55); opacity: .68; }.coupon-card__glow { position: absolute; z-index: -1; top: -85px; right: -65px; width: 190px; height: 190px; border-radius: 50%; background: var(--coupon-color); filter: blur(70px); opacity: .13; pointer-events: none; }
.coupon-card__header, .coupon-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.coupon-card__identity { min-width: 0; display: flex; align-items: center; gap: 11px; }.coupon-card__logo { width: 38px; height: 38px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--coupon-color) 28%, transparent); border-radius: 12px; color: var(--coupon-color); background: color-mix(in srgb, var(--coupon-color) 12%, var(--control-bg)); font-size: 15px; font-weight: 800; }.coupon-card__identity > div { min-width: 0; display: grid; gap: 3px; }.coupon-card__identity small, .coupon-card__benefit small, .coupon-card__code-copy small, .coupon-card__expiry small { color: var(--text-muted); font-size: 8px; line-height: 1; }.coupon-card__identity strong { overflow: hidden; color: var(--text-primary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.coupon-card__status { display: inline-flex; align-items: center; gap: 6px; border: 1px solid color-mix(in srgb, var(--success) 18%, transparent); border-radius: 999px; padding: 6px 9px; color: var(--success); background: color-mix(in srgb, var(--success) 8%, transparent); font-size: 8px; font-weight: 700; white-space: nowrap; }.coupon-card__status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 7px currentColor; }.coupon-card__status[data-status='expiring'] { border-color: color-mix(in srgb, var(--warning) 18%, transparent); color: var(--warning); background: color-mix(in srgb, var(--warning) 8%, transparent); }.coupon-card__status[data-status='expired'], .coupon-card__status[data-status='used'] { border-color: var(--border-color); color: var(--text-muted); background: var(--control-bg); }
.coupon-card__content { min-height: 106px; display: grid; grid-template-columns: minmax(110px, auto) minmax(0, 1fr); align-items: end; gap: 22px; }.coupon-card__benefit { display: grid; align-content: end; gap: 7px; }.coupon-card__benefit strong { max-width: 230px; overflow: hidden; color: var(--coupon-color); font-size: clamp(27px, 2.3vw, 38px); font-weight: 900; letter-spacing: -.045em; line-height: 1; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__details { min-width: 0; display: grid; gap: 7px; padding-bottom: 1px; }.coupon-card__details h2, .coupon-card__details p { margin: 0; }.coupon-card__details h2 { overflow: hidden; color: var(--text-primary); font-size: 15px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__details p { display: -webkit-box; overflow: hidden; color: var(--text-muted); font-size: 9px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.coupon-card__pass { position: relative; width: 100%; min-width: 0; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 11px; overflow: hidden; border: 1px dashed color-mix(in srgb, var(--coupon-color) 30%, var(--border-color)); border-radius: 13px; padding: 11px 12px; color: inherit; background: color-mix(in srgb, var(--coupon-color) 7%, var(--control-bg)); text-align: left; cursor: pointer; transition: background .18s ease, border-color .18s ease; }.coupon-card__pass::before, .coupon-card__pass::after { content: ''; position: absolute; top: 50%; width: 10px; height: 10px; border: 1px solid var(--border-color); border-radius: 50%; background: var(--page-bg); transform: translateY(-50%); }.coupon-card__pass::before { left: -6px; }.coupon-card__pass::after { right: -6px; }.coupon-card__pass:hover { border-color: var(--coupon-color); background: color-mix(in srgb, var(--coupon-color) 12%, var(--control-bg)); }.coupon-card__code-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; color: var(--coupon-color); background: color-mix(in srgb, var(--coupon-color) 13%, transparent); font-size: 16px; }.coupon-card__code-copy { min-width: 0; display: grid; gap: 4px; }.coupon-card__code-copy strong { overflow: hidden; color: var(--text-primary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10px; letter-spacing: .035em; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__show { display: inline-flex; align-items: center; gap: 5px; color: var(--coupon-color); font-size: 9px; font-weight: 800; white-space: nowrap; }
.coupon-card__footer { border-top: 1px solid var(--border-color); padding-top: 15px; }.coupon-card__expiry { display: inline-flex; align-items: center; gap: 8px; color: var(--text-muted); }.coupon-card__expiry > span { display: grid; gap: 4px; }.coupon-card__expiry strong { color: var(--text-secondary); font-size: 9px; }.coupon-card__expiry.warning, .coupon-card__expiry.warning strong { color: var(--warning); }.coupon-card__expiry.danger, .coupon-card__expiry.danger strong { color: var(--danger); }.coupon-card__actions { display: flex; gap: 6px; }
@media (max-width: 520px) { .coupon-card { gap: 16px; padding: 16px; }.coupon-card__content { min-height: 0; grid-template-columns: 1fr; align-items: start; gap: 13px; }.coupon-card__benefit strong { max-width: 100%; }.coupon-card__pass { grid-template-columns: 34px minmax(0, 1fr) auto; }.coupon-card__show { font-size: 0; }.coupon-card__show :deep(svg) { font-size: 12px; } }
</style>
