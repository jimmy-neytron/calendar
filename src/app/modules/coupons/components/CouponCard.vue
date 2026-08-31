<template>
  <article class="coupon-card" :class="{ 'coupon-card--muted': status === 'used' || status === 'expired' }" :style="{ '--coupon-color': coupon.color }" @click="emit('open')">
    <i class="coupon-card__marker" aria-hidden="true" />
    <header class="coupon-card__header">
      <div class="coupon-card__identity">
        <span class="coupon-card__logo">{{ merchantInitial }}</span>
        <div><strong>{{ coupon.merchant || 'Без магазина' }}</strong><small>{{ codeTypeLabel }}</small></div>
      </div>
      <span class="coupon-card__status" :data-status="status">{{ statusLabel }}</span>
    </header>
    <div class="coupon-card__content">
      <div class="coupon-card__details"><h2>{{ coupon.title }}</h2><p>{{ coupon.description || coupon.terms || 'Подробности предложения находятся внутри купона.' }}</p></div>
      <strong class="coupon-card__benefit">{{ discountText }}</strong>
    </div>
    <button type="button" class="coupon-card__pass" @click.stop="emit('open')">
      <span class="coupon-card__code-icon"><UiIcon :name="codeIcon" /></span>
      <span class="coupon-card__code-copy"><small>{{ coupon.codeType === 'none' ? 'Предложение' : 'Код' }}</small><strong>{{ coupon.codeValue ? maskedCode : 'Код не требуется' }}</strong></span>
      <span class="coupon-card__show">{{ coupon.codeType === 'none' ? 'Открыть' : 'Показать код' }} <UiIcon name="right" /></span>
    </button>
    <footer class="coupon-card__footer">
      <span class="coupon-card__expiry" :class="{ danger: status === 'expired', warning: status === 'expiring' }" :title="expiryDateLabel"><UiIcon name="calendar" />{{ expiryLabel }}</span>
      <div class="coupon-card__actions"><UiIconButton icon="edit" label="Изменить купон" size="sm" @click.stop="emit('edit')" /><UiIconButton icon="trash" label="Удалить купон" size="sm" variant="danger" @click.stop="emit('delete')" /></div>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { Coupon } from '../../../types/coupon'
import { formatCouponExpiry, formatCouponExpiryDate } from '../utils/couponExpiry'

type CouponStatus = 'active' | 'expiring' | 'used' | 'expired'
const props = defineProps<{ coupon: Coupon; status: CouponStatus }>()
const emit = defineEmits<{ open: []; edit: []; delete: [] }>()
const merchantInitial = computed(() => (props.coupon.merchant || props.coupon.title || 'К').trim().charAt(0).toLocaleUpperCase('ru-RU'))
const statusLabel = computed(() => ({ active: 'Активен', expiring: 'Скоро истечёт', used: 'Использован', expired: 'Истёк' })[props.status])
const codeIcon = computed(() => ({ qr: 'grid', barcode: 'barcode', promo: 'copy', none: 'notes' })[props.coupon.codeType])
const codeTypeLabel = computed(() => props.coupon.codeType === 'barcode' && props.coupon.secondaryCodeValue
  ? '2 штрихкода'
  : ({ qr: 'QR-код', barcode: 'Штрихкод', promo: 'Промокод', none: 'Без кода' })[props.coupon.codeType])
const maskedCode = computed(() => props.coupon.codeValue.length <= 16 ? props.coupon.codeValue : `${props.coupon.codeValue.slice(0, 7)}…${props.coupon.codeValue.slice(-5)}`)
const discountText = computed(() => {
  if (props.coupon.discountLabel) return props.coupon.discountLabel
  if (props.coupon.discountType === 'percent') return `−${props.coupon.discountValue}%`
  if (props.coupon.discountType === 'amount') return `−${new Intl.NumberFormat('ru-RU').format(props.coupon.discountValue)} ₽`
  return 'Выгодное предложение'
})
const expiryLabel = computed(() => formatCouponExpiry(props.coupon.expiresOn))
const expiryDateLabel = computed(() => formatCouponExpiryDate(props.coupon.expiresOn))
</script>

<style scoped>
.coupon-card { position: relative; min-width: 0; display: grid; gap: 14px; overflow: hidden; border: 1px solid var(--border-color); border-radius: 13px; padding: 15px; background: var(--panel-bg); cursor: pointer; transition: border-color .18s var(--ease-out), box-shadow .18s var(--ease-out), transform .18s var(--ease-out); }.coupon-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); transform: translateY(-1px); }.coupon-card--muted { opacity: .58; }.coupon-card__marker { position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--coupon-color); opacity: .75; }.coupon-card__header,.coupon-card__footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.coupon-card__identity { min-width: 0; display: flex; align-items: center; gap: 9px; }.coupon-card__logo { width: 32px; height: 32px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid var(--border-color); border-radius: 9px; color: var(--text-secondary); background: var(--control-bg); font-size: 12px; font-weight: 800; }.coupon-card__identity>div { min-width: 0; display: grid; gap: 3px; }.coupon-card__identity strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__identity small,.coupon-card__code-copy small { color: var(--text-muted); font-size: 8px; }.coupon-card__status { border-radius: 999px; padding: 4px 7px; color: var(--success); background: color-mix(in srgb,var(--success) 7%,var(--control-bg)); font-size: 8px; font-weight: 700; white-space: nowrap; }.coupon-card__status[data-status='expiring'] { color: var(--warning); background: color-mix(in srgb,var(--warning) 8%,var(--control-bg)); }.coupon-card__status[data-status='expired'],.coupon-card__status[data-status='used'] { color: var(--text-muted); background: var(--control-bg); }.coupon-card__content { min-height: 78px; display: grid; grid-template-columns:minmax(0,1fr) auto; align-items: end; gap: 15px; }.coupon-card__details { min-width: 0; display: grid; gap: 5px; }.coupon-card__details h2,.coupon-card__details p { margin: 0; }.coupon-card__details h2 { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__details p { display:-webkit-box; overflow:hidden; color:var(--text-muted); font-size:9px; line-height:1.45; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.coupon-card__benefit { max-width: 150px; overflow: hidden; color: var(--text-primary); font-size: 22px; letter-spacing: -.035em; text-overflow: ellipsis; white-space: nowrap; }.coupon-card__pass { width:100%; min-width:0; display:grid; grid-template-columns:30px minmax(0,1fr) auto; align-items:center; gap:9px; border:1px solid var(--border-color); border-radius:10px; padding:9px 10px; color:inherit; background:var(--control-bg); text-align:left; }.coupon-card__pass:hover { border-color:var(--border-strong); background:var(--control-bg-hover); }.coupon-card__code-icon { width:28px; height:28px; display:grid; place-items:center; border-radius:8px; color:var(--text-secondary); background:var(--card-solid); font-size:13px; }.coupon-card__code-copy { min-width:0; display:grid; gap:3px; }.coupon-card__code-copy strong { overflow:hidden; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }.coupon-card__show { display:inline-flex; align-items:center; gap:4px; color:var(--text-secondary); font-size:8px; font-weight:700; white-space:nowrap; }.coupon-card__footer { border-top:1px solid var(--border-color); padding-top:11px; }.coupon-card__expiry { display:inline-flex; align-items:center; gap:6px; color:var(--text-muted); font-size:8px; }.coupon-card__expiry.warning { color:var(--warning); }.coupon-card__expiry.danger { color:var(--danger); }.coupon-card__actions { display:flex; gap:4px; }
@media(max-width:520px){.coupon-card__content{grid-template-columns:1fr;align-items:start}.coupon-card__benefit{grid-row:1}.coupon-card__show{font-size:0}.coupon-card__show :deep(svg){font-size:12px}}
</style>
