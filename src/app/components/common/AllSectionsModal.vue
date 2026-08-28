<template>
  <UiModal
    :model-value="modelValue"
    title="Все разделы"
    eyebrow="Навигация"
    width="720px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <label class="all-sections__search">
      <UiIcon name="search" />
      <input v-model.trim="query" type="search" placeholder="Найти раздел" autofocus />
      <span v-if="query">{{ resultCount }}</span>
    </label>

    <div v-if="filteredGroups.length" class="all-sections__groups">
      <section v-for="group in filteredGroups" :key="group.label">
        <header>{{ group.label }}</header>
        <div>
          <RouterLink
            v-for="item in group.items"
            :key="item.name"
            :to="{ name: item.name }"
            class="all-sections__item"
            @click="$emit('update:modelValue', false)"
          >
            <span><UiIcon :name="item.icon" /></span>
            <div>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </div>
            <i v-if="hiddenSectionIds.includes(item.name)">Скрыт</i>
            <UiIcon v-else name="right" />
          </RouterLink>
        </div>
      </section>
    </div>

    <div v-else class="all-sections__empty">
      <UiIcon name="search" />
      <strong>Ничего не найдено</strong>
      <small>Попробуйте изменить запрос</small>
    </div>

    <footer class="all-sections__footer">
      <span>Скрытие меняет только меню — данные и функции остаются на месте.</span>
      <UiButton variant="secondary" icon="settings" @click="$emit('customize')">Настроить меню</UiButton>
    </footer>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SidebarGroup } from '../../navigation/sidebarSections'
import UiButton from '../ui/UiButton.vue'
import UiIcon from '../ui/UiIcon.vue'
import UiModal from '../ui/UiModal.vue'

const props = defineProps<{
  modelValue: boolean
  groups: SidebarGroup[]
  hiddenSectionIds: string[]
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  customize: []
}>()

const query = ref('')
watch(() => props.modelValue, (open) => { if (!open) query.value = '' })

const filteredGroups = computed(() => {
  const needle = query.value.toLocaleLowerCase('ru')
  return props.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase('ru').includes(needle)),
    }))
    .filter((group) => group.items.length)
})
const resultCount = computed(() => filteredGroups.value.reduce((count, group) => count + group.items.length, 0))
</script>

<style scoped>
.all-sections__search{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:8px;height:42px;border:1px solid var(--border-color);border-radius:12px;padding:0 11px;color:var(--text-muted);background:var(--field-bg)}.all-sections__search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.all-sections__search input{min-width:0;border:0;outline:0;color:var(--text-primary);background:transparent;font:inherit}.all-sections__search span{border-radius:99px;padding:3px 7px;background:var(--control-bg);font-size:9px;font-weight:800}
.all-sections__groups{display:grid;grid-template-columns:1fr 1fr;gap:18px 12px;margin-top:16px}.all-sections__groups section>header{padding:0 7px 6px;color:var(--text-muted);font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.all-sections__groups section>div{display:grid;gap:5px}.all-sections__item{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:9px;min-height:52px;border:1px solid var(--border-color);border-radius:12px;padding:6px 9px;color:var(--text-secondary);background:var(--card-soft);text-decoration:none;transition:.16s var(--ease-out)}.all-sections__item:hover{border-color:var(--accent-border);background:var(--accent-soft);transform:translateY(-1px)}.all-sections__item>span{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--control-bg)}.all-sections__item div{min-width:0}.all-sections__item strong,.all-sections__item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.all-sections__item strong{color:var(--text-primary);font-size:11px}.all-sections__item small{margin-top:2px;color:var(--text-muted);font-size:9px}.all-sections__item i{border-radius:99px;padding:3px 6px;color:var(--text-muted);background:var(--control-bg);font-size:8px;font-style:normal;font-weight:750}.all-sections__item>svg{font-size:13px}
.all-sections__empty{display:grid;justify-items:center;gap:5px;padding:56px 12px;color:var(--text-muted)}.all-sections__empty>svg{font-size:28px}.all-sections__empty strong{color:var(--text-secondary)}.all-sections__empty small{font-size:10px}.all-sections__footer{position:sticky;bottom:-16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px -16px -16px;padding:12px 16px;border-top:1px solid var(--border-color);background:var(--panel-bg)}.all-sections__footer>span{color:var(--text-muted);font-size:9px}
@media(max-width:620px){.all-sections__groups{grid-template-columns:1fr}.all-sections__footer{bottom:-11px;margin:12px -12px -11px;padding:10px 12px}.all-sections__footer>span{display:none}}
</style>
