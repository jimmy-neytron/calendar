<template>
  <article class="wardrobe-item">
    <div class="wardrobe-item__media" :style="{ '--item-color': item.color }">
      <img v-if="imageUrl" :src="imageUrl" :alt="item.name" loading="lazy">
      <span v-else><WardrobeGarmentIcon :category="item.category" /></span>
      <button v-if="editable" type="button" :class="{ active: item.favorite }" :aria-label="item.favorite ? 'Убрать из избранного' : 'В избранное'" @click="$emit('favorite')"><UiIcon name="star" /></button>
    </div>
    <div class="wardrobe-item__body">
      <header><div><small>{{ categoryLabel }}</small><h2>{{ item.name }}</h2></div><i :style="{ background: item.color }" /></header>
      <p>{{ [item.brand, item.size && `Размер ${item.size}`].filter(Boolean).join(' · ') || 'Без дополнительных данных' }}</p>
      <div class="wardrobe-item__seasons"><span v-for="season in item.seasons" :key="season">{{ season }}</span></div>
      <footer><span><UiIcon :name="item.visibility === 'shared' ? 'users' : 'key'" /> {{ item.visibility === 'shared' ? 'Общая' : 'Личная' }}</span><div v-if="editable"><UiIconButton icon="edit" label="Изменить вещь" @click="$emit('edit')" /><UiIconButton icon="trash" label="Удалить вещь" variant="danger" @click="$emit('delete')" /></div></footer>
    </div>
  </article>
</template>

<script setup lang="ts">
import UiIcon from '../../../components/ui/UiIcon.vue'
import UiIconButton from '../../../components/ui/UiIconButton.vue'
import type { WardrobeItem } from '../../../types/wardrobe'
import WardrobeGarmentIcon from './WardrobeGarmentIcon.vue'
defineProps<{ item: WardrobeItem; imageUrl: string; editable: boolean; categoryLabel: string }>()
defineEmits(['favorite','edit','delete'])
</script>

<style scoped>
.wardrobe-item{display:grid;grid-template-rows:230px minmax(0,1fr);min-width:0;overflow:hidden;border:1px solid var(--border-color);border-radius:18px;background:var(--card-solid)}.wardrobe-item__media{position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--item-color) 18%,var(--control-bg)),var(--control-bg) 68%)}.wardrobe-item__media img{width:100%;height:100%;object-fit:contain}.wardrobe-item__media>span{width:92px;height:92px;padding:15px;color:var(--item-color);filter:drop-shadow(0 12px 24px color-mix(in srgb,var(--item-color) 20%,transparent))}.wardrobe-item__media>button{position:absolute;right:10px;top:10px;display:grid;place-items:center;width:32px;height:32px;border:1px solid color-mix(in srgb,white 12%,var(--border-color));border-radius:10px;color:var(--text-muted);background:color-mix(in srgb,var(--panel-bg) 82%,transparent);backdrop-filter:blur(10px)}.wardrobe-item__media>button.active{color:#fbbf24}.wardrobe-item__media>button.active :deep(svg){fill:currentColor}.wardrobe-item__body{display:grid;align-content:start;gap:7px;padding:12px}.wardrobe-item__body>header{display:flex;align-items:start;justify-content:space-between;gap:8px}.wardrobe-item__body header small{color:var(--text-muted);font-size:8px;text-transform:uppercase}.wardrobe-item h2{overflow:hidden;margin:2px 0 0;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.wardrobe-item__body header i{flex:0 0 auto;width:13px;height:13px;border:2px solid var(--card-solid);border-radius:50%;box-shadow:0 0 0 1px var(--border-color)}.wardrobe-item__body>p{margin:0;color:var(--text-muted);font-size:10px}.wardrobe-item__seasons{display:flex;gap:4px;min-height:20px;flex-wrap:wrap}.wardrobe-item__seasons span{border-radius:999px;padding:4px 7px;color:var(--text-secondary);background:var(--control-bg);font-size:8px}.wardrobe-item footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;border-top:1px solid var(--border-color);padding-top:9px}.wardrobe-item footer>span{display:flex;align-items:center;gap:4px;color:var(--text-muted);font-size:8px}.wardrobe-item footer>div{display:flex;gap:3px}@media(max-width:680px){.wardrobe-item{grid-template-columns:112px minmax(0,1fr);grid-template-rows:minmax(170px,auto)}.wardrobe-item__body{padding:10px}.wardrobe-item__media>span{width:68px;height:68px}.wardrobe-item footer{align-items:flex-end}}
</style>
