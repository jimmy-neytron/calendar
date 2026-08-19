<template>
  <UiModal :model-value="modelValue" :title="challenge ? 'Редактировать челлендж' : 'Новый челлендж'" eyebrow="Личный вызов" width="620px" @update:model-value="$emit('update:modelValue', $event)">
    <form class="challenge-editor" @submit.prevent="submit">
      <UiInput v-model="form.title" label="Название" placeholder="Например: 30 дней без сахара" required />
      <UiInput v-model="form.activity" label="Ежедневное действие" placeholder="Что нужно делать каждый день?" />
      <div class="challenge-editor__grid"><UiInput v-model="form.targetDays" type="number" min="1" max="1000" label="Количество дней" /><UiInput v-model="form.startDate" type="date" label="Дата начала" /></div>
      <UiInput v-model="form.description" type="textarea" label="Описание" placeholder="Зачем тебе этот челлендж и какие правила?" />
      <div class="challenge-editor__grid"><UiInput v-model="form.finalReward" label="Финальная награда" placeholder="Чем наградишь себя?" /><label><span>Цвет</span><input v-model="form.color" type="color"></label></div>
      <p v-if="error">{{ error }}</p>
      <footer><UiButton variant="secondary" @click="$emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit" icon="check">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</template>
<script setup>
import { reactive, ref, watch } from 'vue'
import UiButton from '../ui/UiButton.vue'; import UiInput from '../ui/UiInput.vue'; import UiModal from '../ui/UiModal.vue'
import { DateHelper } from '../../utils/date/dateHelper.js'
const props = defineProps({ modelValue: { type: Boolean, default: false }, challenge: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue', 'save']); const error = ref('')
const form = reactive({ title: '', activity: '', targetDays: 30, startDate: '', description: '', finalReward: '', color: '#a78bfa' })
watch(() => props.modelValue, (open) => { if (open) { Object.assign(form, { title: props.challenge?.title || '', activity: props.challenge?.activity || '', targetDays: props.challenge?.targetDays || 30, startDate: props.challenge?.startDate || DateHelper.toKey(new Date()), description: props.challenge?.description || '', finalReward: props.challenge?.finalReward || '', color: props.challenge?.color || '#a78bfa' }); error.value = '' } })
function submit() { if (!form.title.trim()) { error.value = 'Укажи название челленджа'; return } emit('save', { id: props.challenge?.id || '', ...form }) }
</script>
<style scoped>
.challenge-editor{display:grid;gap:11px}.challenge-editor__grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.challenge-editor label{display:grid;gap:5px}.challenge-editor label span{color:var(--text-secondary);font-size:11px;font-weight:700}.challenge-editor input[type=color]{width:100%;height:36px;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:4px;background:var(--field-bg)}.challenge-editor>p{margin:0;color:var(--danger);font-size:11px}.challenge-editor footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--border-color);padding-top:12px}@media(max-width:580px){.challenge-editor__grid{grid-template-columns:1fr}}
</style>
