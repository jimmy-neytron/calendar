<template>
  <article class="look-card">
    <WardrobeLookCanvas :items="items" :image-urls="imageUrls" :model-value="look.layout" compact />
    <div class="look-card__body">
      <header><div><small>{{ occasionLabel }}</small><h2>{{ look.title }}</h2></div><UiIcon v-if="look.favorite" name="star" /></header>
      <p>{{ look.note || `${items.length} ${itemWord}` }}</p>
      <footer><span><UiIcon :name="look.visibility === 'shared' ? 'users' : 'key'" /> {{ look.visibility === 'shared' ? 'Общий образ' : 'Личный образ' }}</span><div v-if="editable"><UiIconButton icon="edit" label="Изменить образ" @click="$emit('edit')"/><UiIconButton icon="trash" label="Удалить образ" variant="danger" @click="$emit('delete')"/></div></footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { WardrobeItem, WardrobeLook } from '../../../types/wardrobe'
import WardrobeLookCanvas from './WardrobeLookCanvas.vue'
const props=defineProps<{look:WardrobeLook;items:WardrobeItem[];imageUrls:Record<string,string>;editable:boolean;occasionLabel:string}>()
defineEmits(['edit','delete'])
const itemWord=computed(()=>props.items.length===1?'вещь':props.items.length<5?'вещи':'вещей')
</script>

<style scoped>
.look-card{min-width:0;overflow:hidden;border:1px solid var(--border-color);border-radius:18px;background:var(--card-solid)}.look-card__body{display:grid;gap:7px;padding:12px}.look-card header{display:flex;align-items:start;justify-content:space-between;gap:8px}.look-card header small{color:var(--success);font-size:8px;text-transform:uppercase}.look-card header>svg{flex:0 0 auto;color:#fbbf24;fill:currentColor}.look-card h2{overflow:hidden;margin:2px 0 0;font-size:16px;text-overflow:ellipsis;white-space:nowrap}.look-card p{overflow:hidden;margin:0;color:var(--text-muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.look-card footer{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--border-color);padding-top:9px}.look-card footer>span{display:flex;align-items:center;gap:4px;color:var(--text-muted);font-size:8px}.look-card footer>div{display:flex;gap:3px}
</style>
