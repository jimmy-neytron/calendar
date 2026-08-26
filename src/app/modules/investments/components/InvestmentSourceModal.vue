<template>
  <UiModal :model-value="modelValue" :title="source ? 'Изменить источник' : 'Новый источник'" width="520px" @update:model-value="emit('update:modelValue', $event)">
    <form class="source-form" @submit.prevent="submit">
      <div class="source-form__types">
        <button v-for="item in types" :key="item.value" type="button" :class="{ active: form.type === item.value }" @click="form.type = item.value">
          <UiIcon :name="item.icon" /><span>{{ item.label }}</span>
        </button>
      </div>
      <UiInput v-model="form.name" label="Название" placeholder="Например, основной кошелёк" required />
      <UiInput v-model="form.note" type="textarea" label="Заметка" placeholder="Необязательно" />
      <p v-if="error" class="source-form__error">{{ error }}</p>
      <footer><UiButton type="button" variant="secondary" @click="emit('update:modelValue', false)">Отмена</UiButton><UiButton type="submit">Сохранить</UiButton></footer>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { InvestmentSource, InvestmentSourceType } from '../../../types/investment'
import UiButton from '../../../components/ui/UiButton.vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiInput from '../../../components/ui/UiInput.vue'
import UiModal from '../../../components/ui/UiModal.vue'

const props = defineProps<{ modelValue: boolean; source?: InvestmentSource | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; save: [payload: Pick<InvestmentSource, 'name' | 'type' | 'color' | 'note'>] }>()
const types: Array<{ value: InvestmentSourceType; label: string; icon: string; color: string }> = [
  { value: 'wallet', label: 'Кошелёк', icon: 'wallet', color: '#7c8cf8' }, { value: 'exchange', label: 'Биржа', icon: 'chart', color: '#38bdf8' },
  { value: 'cash', label: 'Наличные', icon: 'wallet', color: '#34d399' }, { value: 'bank', label: 'Банк', icon: 'home', color: '#f59e0b' },
  { value: 'broker', label: 'Брокер', icon: 'activity', color: '#a78bfa' }, { value: 'other', label: 'Другое', icon: 'grid', color: '#94a3b8' },
]
const form = reactive<{ name: string; type: InvestmentSourceType; note: string }>({ name: '', type: 'wallet', note: '' })
const error = ref('')

watch(() => props.modelValue, (open) => {
  if (!open) return
  Object.assign(form, { name: props.source?.name || '', type: props.source?.type || 'wallet', note: props.source?.note || '' })
  error.value = ''
})
function submit() {
  if (!form.name.trim()) { error.value = 'Укажи название источника'; return }
  const type = types.find((item) => item.value === form.type) || types[0]
  emit('save', { name: form.name.trim(), type: form.type, note: form.note.trim(), color: props.source?.color || type.color })
}
</script>

<style scoped>
.source-form { display: grid; gap: 13px; }.source-form__types { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }.source-form__types button { display: grid; justify-items: center; gap: 6px; border: 1px solid var(--border-color); border-radius: 10px; padding: 11px 7px; color: var(--text-secondary); background: var(--control-bg); font-size: 9px; }.source-form__types button :deep(svg) { width: 18px; height: 18px; }.source-form__types button.active { border-color: var(--accent); color: var(--text-primary); background: var(--accent-soft); }.source-form__error { margin: 0; color: var(--danger); font-size: 10px; }.source-form footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 12px; }
</style>
