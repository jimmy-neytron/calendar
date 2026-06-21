<template>
  <article
    class="app-toast"
    :class="`app-toast--${normalizedType}`"
    :style="{ '--toast-duration': `${notification.duration}ms` }"
    role="status"
  >
    <div class="app-toast__glow" />
    <div class="app-toast__icon">
      <span class="app-toast__icon-ring" />
      <UiIcon :name="icon" />
    </div>

    <div class="app-toast__content">
      <small>{{ title }}</small>
      <p>{{ notification.message }}</p>
      <button
        v-if="notification.action"
        class="app-toast__action"
        type="button"
        @click="$emit('action', notification)"
      >
        {{ notification.actionLabel || 'Отменить' }}
        <UiIcon name="right" />
      </button>
    </div>

    <button class="app-toast__close" type="button" aria-label="Закрыть уведомление" @click="$emit('dismiss', notification.id)">
      <UiIcon name="close" />
    </button>

    <div class="app-toast__progress"><span /></div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import UiIcon from '../ui/UiIcon.vue'

const props = defineProps({
  notification: { type: Object, required: true },
})

defineEmits(['dismiss', 'action'])

const normalizedType = computed(() => ['success', 'danger', 'warning', 'info'].includes(props.notification.type)
  ? props.notification.type
  : 'info')
const title = computed(() => ({
  success: 'Готово',
  danger: 'Ошибка',
  warning: 'Обрати внимание',
  info: 'Информация',
})[normalizedType.value])
const icon = computed(() => ({
  success: 'check',
  danger: 'close',
  warning: 'warning',
  info: 'activity',
})[normalizedType.value])
</script>

<style scoped>
.app-toast{--toast-color:var(--info);position:relative;width:min(390px,calc(100vw - 24px));display:grid;grid-template-columns:42px minmax(0,1fr) 28px;align-items:start;gap:11px;border:1px solid color-mix(in srgb,var(--toast-color) 30%,var(--border-color));border-radius:17px;padding:13px 12px 11px;overflow:hidden;color:var(--text-primary);background:color-mix(in srgb,var(--toast-bg) 94%,transparent);box-shadow:0 18px 55px rgba(0,0,0,.34);backdrop-filter:blur(18px)}.app-toast--success{--toast-color:var(--success)}.app-toast--danger{--toast-color:var(--danger)}.app-toast--warning{--toast-color:var(--warning)}.app-toast__glow{position:absolute;left:-35px;top:-50px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--toast-color) 17%,transparent),transparent 68%);pointer-events:none}.app-toast__icon{position:relative;display:grid;place-items:center;width:42px;height:42px;border-radius:13px;color:#fff;background:var(--toast-color);box-shadow:0 8px 24px color-mix(in srgb,var(--toast-color) 20%,transparent);font-size:19px;animation:toastIconEnter .48s cubic-bezier(.34,1.56,.64,1) both}.app-toast__icon-ring{position:absolute;inset:-5px;border:1px solid color-mix(in srgb,var(--toast-color) 38%,transparent);border-radius:17px;animation:toastRing .7s .12s var(--ease-out) both}.app-toast__content{position:relative;min-width:0;padding-top:1px}.app-toast__content small{display:block;color:var(--toast-color);font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.app-toast__content p{margin:3px 0 0;color:var(--text-secondary);font-size:12px;line-height:1.45}.app-toast__action{display:inline-flex;align-items:center;gap:4px;border:0;margin-top:7px;padding:0;color:var(--text-primary);background:transparent;font-size:10px;font-weight:850}.app-toast__action svg{transition:transform .18s var(--ease-out)}.app-toast__action:hover svg{transform:translateX(2px)}.app-toast__close{position:relative;display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:50%;color:var(--text-muted);background:transparent}.app-toast__close:hover{color:var(--text-primary);background:var(--control-bg)}.app-toast__progress{position:absolute;left:0;right:0;bottom:0;height:3px;background:color-mix(in srgb,var(--toast-color) 8%,transparent)}.app-toast__progress span{display:block;width:100%;height:100%;background:linear-gradient(90deg,color-mix(in srgb,var(--toast-color) 50%,transparent),var(--toast-color));transform-origin:left;animation:toastProgress var(--toast-duration) linear forwards}@keyframes toastIconEnter{from{opacity:0;transform:scale(.35) rotate(-18deg)}to{opacity:1;transform:none}}@keyframes toastRing{from{opacity:.8;transform:scale(.55)}to{opacity:0;transform:scale(1.35)}}@keyframes toastProgress{to{transform:scaleX(0)}}@media(max-width:520px){.app-toast{width:calc(100vw - 20px)}}@media(prefers-reduced-motion:reduce){.app-toast__icon,.app-toast__icon-ring,.app-toast__progress span{animation-duration:.01ms!important;animation-delay:0ms!important}}
</style>

