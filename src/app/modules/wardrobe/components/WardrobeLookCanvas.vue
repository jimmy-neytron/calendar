<template>
  <section ref="wrapRef" class="look-canvas-wrap" :class="{ 'look-canvas-wrap--editable': editable, 'look-canvas-wrap--compact': compact }">
    <div ref="canvasRef" class="look-canvas" :style="canvasSizeStyle" @pointerdown.self="selectedId=''">
      <div class="look-canvas__guide" aria-hidden="true"><i/><span/></div>
      <button
        v-for="placement in placements"
        :key="placement.itemId"
        class="look-canvas__item"
        :class="{ selected: editable && selectedId===placement.itemId }"
        :style="placementStyle(placement)"
        :aria-label="itemById(placement.itemId)?.name"
        type="button"
        @pointerdown="startDrag($event,placement)"
      >
        <img v-if="imageUrls[placement.itemId]" :src="imageUrls[placement.itemId]" :alt="itemById(placement.itemId)?.name" draggable="false">
        <WardrobeGarmentIcon v-else-if="itemById(placement.itemId)" :category="itemById(placement.itemId)!.category" />
      </button>
      <div v-if="!items.length" class="look-canvas__empty"><UiIcon name="hanger"/><span>Выберите вещи для образа</span></div>
    </div>
    <div v-if="editable" ref="toolbarRef" class="look-canvas__toolbar">
      <span v-if="selectedItem"><b>{{ selectedItem.name }}</b><small>Размер {{ Math.round(selectedPlacement?.width || 0) }}% · перетаскивайте на холсте</small></span>
      <span v-else><b>Соберите образ</b><small>Нажмите на вещь, чтобы настроить</small></span>
      <div>
        <button type="button" :disabled="!selectedItem" aria-label="Уменьшить" @click="resize(-5)"><UiIcon name="minus"/></button>
        <button type="button" :disabled="!selectedItem" aria-label="Увеличить" @click="resize(5)"><UiIcon name="plus"/></button>
        <button type="button" :disabled="!selectedItem" aria-label="На слой ниже" @click="changeLayer(-1)"><UiIcon name="down"/></button>
        <button type="button" :disabled="!selectedItem" aria-label="На слой выше" @click="changeLayer(1)"><UiIcon name="up"/></button>
        <button type="button" aria-label="Вернуть исходное расположение" @click="$emit('reset')"><UiIcon name="refresh"/></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'
import type { WardrobeItem, WardrobeLookPlacement } from '../../../types/wardrobe'
import { clamp, reconcileLookLayout } from '../utils/wardrobeLookLayout'
import WardrobeGarmentIcon from './WardrobeGarmentIcon.vue'

const props=withDefaults(defineProps<{items:WardrobeItem[];imageUrls:Record<string,string>;modelValue:WardrobeLookPlacement[];editable?:boolean;compact?:boolean}>(),{editable:false,compact:false})
const emit=defineEmits<{(event:'update:modelValue',value:WardrobeLookPlacement[]):void;(event:'reset'):void}>()
const wrapRef=ref<HTMLElement|null>(null),canvasRef=ref<HTMLElement|null>(null),toolbarRef=ref<HTMLElement|null>(null),selectedId=ref('')
const wrapSize=ref({width:0,height:0})
const placements=computed(()=>reconcileLookLayout(props.items,props.modelValue))
const selectedItem=computed(()=>props.items.find(item=>item.id===selectedId.value))
const selectedPlacement=computed(()=>placements.value.find(item=>item.itemId===selectedId.value))
const canvasSizeStyle=computed(()=>{const width=wrapSize.value.width;if(!width)return{};if(props.compact)return{width:`${width}px`,height:`${width/0.8}px`};const toolbarHeight=toolbarRef.value?.offsetHeight||50;const availableHeight=Math.max(240,wrapSize.value.height-toolbarHeight-8);const fittedWidth=Math.min(width,availableHeight*0.8,680);return{width:`${fittedWidth}px`,height:`${fittedWidth/0.8}px`}})
let drag:null|{itemId:string;startX:number;startY:number;x:number;y:number;pointerId:number}=null
let resizeObserver:ResizeObserver|null=null

function itemById(id:string){return props.items.find(item=>item.id===id)}
function placementStyle(placement:WardrobeLookPlacement){return{left:`${placement.x}%`,top:`${placement.y}%`,width:`${placement.width}%`,zIndex:placement.zIndex,transform:`translate(-50%,-50%) rotate(${placement.rotation}deg)`,'--item-color':itemById(placement.itemId)?.color||'#64748b'}}
function startDrag(event:PointerEvent,placement:WardrobeLookPlacement){if(!props.editable)return;event.preventDefault();selectedId.value=placement.itemId;bringToFront(placement.itemId);drag={itemId:placement.itemId,startX:event.clientX,startY:event.clientY,x:placement.x,y:placement.y,pointerId:event.pointerId};(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);window.addEventListener('pointermove',moveDrag);window.addEventListener('pointerup',stopDrag);window.addEventListener('pointercancel',stopDrag)}
function moveDrag(event:PointerEvent){if(!drag||event.pointerId!==drag.pointerId||!canvasRef.value)return;const rect=canvasRef.value.getBoundingClientRect();updatePlacement(drag.itemId,{x:clamp(drag.x+(event.clientX-drag.startX)/rect.width*100,3,97),y:clamp(drag.y+(event.clientY-drag.startY)/rect.height*100,3,97)})}
function stopDrag(){drag=null;window.removeEventListener('pointermove',moveDrag);window.removeEventListener('pointerup',stopDrag);window.removeEventListener('pointercancel',stopDrag)}
function updatePlacement(itemId:string,updates:Partial<WardrobeLookPlacement>){emit('update:modelValue',placements.value.map(placement=>placement.itemId===itemId?{...placement,...updates}:placement))}
function bringToFront(itemId:string){const max=Math.max(0,...placements.value.map(item=>item.zIndex));updatePlacement(itemId,{zIndex:max+1})}
function resize(delta:number){const placement=placements.value.find(item=>item.itemId===selectedId.value);if(placement)updatePlacement(placement.itemId,{width:clamp(placement.width+delta,8,90)})}
function changeLayer(direction:number){const placement=placements.value.find(item=>item.itemId===selectedId.value);if(placement)updatePlacement(placement.itemId,{zIndex:Math.max(1,placement.zIndex+direction)})}
onMounted(()=>{if(!wrapRef.value)return;resizeObserver=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect)wrapSize.value={width:rect.width,height:rect.height}});resizeObserver.observe(wrapRef.value)})
onBeforeUnmount(()=>{stopDrag();resizeObserver?.disconnect()})
</script>

<style scoped>
.look-canvas-wrap{display:grid;gap:8px;min-width:0}.look-canvas{position:relative;width:100%;height:100%;min-height:480px;overflow:hidden;border:1px solid var(--border-color);border-radius:20px;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--success) 8%,var(--control-bg)),var(--control-bg) 70%);isolation:isolate}.look-canvas::before{position:absolute;inset:0;background-image:linear-gradient(color-mix(in srgb,var(--border-color) 45%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--border-color) 45%,transparent) 1px,transparent 1px);background-size:28px 28px;content:'';opacity:.18}.look-canvas__guide{position:absolute;left:50%;top:7%;width:29%;height:82%;transform:translateX(-50%);opacity:.07}.look-canvas__guide i{position:absolute;left:calc(50% - 18px);width:36px;height:36px;border:1px solid var(--text-muted);border-radius:50%}.look-canvas__guide span{position:absolute;inset:44px 0 0;border:1px solid var(--text-muted);border-radius:45% 45% 30% 30%}.look-canvas__item{position:absolute;display:grid;place-items:center;aspect-ratio:1;border:1px solid transparent;padding:0;color:var(--item-color);background:transparent;cursor:grab;touch-action:none;user-select:none;filter:drop-shadow(0 10px 14px rgba(0,0,0,.22))}.look-canvas__item:active{cursor:grabbing}.look-canvas__item.selected{border-color:var(--success);border-radius:16px;background:color-mix(in srgb,var(--success) 5%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--success) 12%,transparent)}.look-canvas__item img{width:100%;height:100%;object-fit:contain;pointer-events:none}.look-canvas__item>svg{width:72%;height:72%;pointer-events:none}.look-canvas__empty{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;color:var(--text-muted)}.look-canvas__empty svg{font-size:42px}.look-canvas__empty span{font-size:11px}.look-canvas__toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--border-color);border-radius:15px;padding:8px 10px;background:var(--card-soft)}.look-canvas__toolbar>span b,.look-canvas__toolbar>span small{display:block}.look-canvas__toolbar>span b{font-size:11px}.look-canvas__toolbar>span small{margin-top:2px;color:var(--text-muted);font-size:8px}.look-canvas__toolbar>div{display:flex;gap:4px}.look-canvas__toolbar button{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-secondary);background:var(--control-bg)}.look-canvas__toolbar button:disabled{opacity:.35}.look-canvas-wrap--compact,.look-canvas-wrap--compact .look-canvas{height:350px;min-height:0}.look-canvas-wrap--compact .look-canvas{border:0;border-radius:0}.look-canvas-wrap--compact .look-canvas::before{display:none}.look-canvas-wrap--compact .look-canvas__item{cursor:default}.look-canvas-wrap--compact .look-canvas__guide{opacity:.045}
@media(max-width:720px){.look-canvas{min-height:410px}.look-canvas__toolbar{align-items:flex-start;flex-direction:column}.look-canvas__toolbar>div{width:100%;justify-content:flex-end}.look-canvas-wrap--compact,.look-canvas-wrap--compact .look-canvas{height:320px}}
.look-canvas{background:radial-gradient(circle at 50% 40%,#f7f8f5,#e5e8e4 72%)}
.look-canvas__item img{mix-blend-mode:normal}
.look-canvas-wrap--editable .look-canvas{justify-self:center;width:auto;height:100%;max-width:100%;min-height:0;aspect-ratio:4/5}
.look-canvas-wrap--compact{height:auto}.look-canvas-wrap--compact .look-canvas{width:100%;height:auto;min-height:0;aspect-ratio:4/5}
</style>
