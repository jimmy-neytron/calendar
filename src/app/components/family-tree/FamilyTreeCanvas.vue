<template><div ref="host" class="tree-canvas" aria-label="Интерактивное семейное дерево" /></template>
<script setup>
import cytoscape from 'cytoscape'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props=defineProps({people:{type:Array,default:()=>[]},relationships:{type:Array,default:()=>[]},positions:{type:Object,default:()=>({})},selectedId:{type:String,default:''},visibleIds:{type:Array,default:()=>[]}})
const emit=defineEmits(['select','positions']);const host=ref(null);let cy
function elements(){const ok=new Set(props.visibleIds.length?props.visibleIds:props.people.map(p=>p.id));return [...props.people.filter(p=>ok.has(p.id)).map(p=>({data:{id:p.id,label:[p.firstName,p.lastName].filter(Boolean).join(' '),gender:p.gender||'other'},position:props.positions[p.id]})),...props.relationships.filter(r=>ok.has(r.from)&&ok.has(r.to)).map(r=>({data:{id:r.id,source:r.from,target:r.to,type:r.type}}))]}
function select(){if(!cy)return;cy.nodes().removeClass('selected');const n=cy.getElementById(props.selectedId);if(n.length){n.addClass('selected');cy.animate({center:{eles:n},duration:250})}}
function draw(){if(!cy)return;cy.elements().remove();cy.add(elements());cy.layout({name:Object.keys(props.positions).length?'preset':'breadthfirst',directed:true,padding:70,spacingFactor:1.35}).run();select()}
onMounted(()=>{cy=cytoscape({container:host.value,elements:elements(),wheelSensitivity:.22,minZoom:.25,maxZoom:2.5,style:[
{selector:'node',style:{width:120,height:66,shape:'round-rectangle','background-color':'#151515','border-width':2,'border-color':'#666',label:'data(label)',color:'#f5f5f5','font-size':12,'font-weight':700,'text-wrap':'wrap','text-max-width':105,'text-valign':'center'}},
{selector:'node[gender="female"]',style:{'border-color':'#bd4f88'}},{selector:'node[gender="male"]',style:{'border-color':'#2f6ea5'}},{selector:'node.selected',style:{'border-width':4,'border-color':'#f5f5f5'}},
{selector:'edge',style:{width:2,'line-color':'#555','target-arrow-color':'#555','target-arrow-shape':'triangle','curve-style':'bezier'}},{selector:'edge[type="partner"]',style:{'line-style':'dashed','target-arrow-shape':'none','line-color':'#bd4f88'}}
],layout:{name:Object.keys(props.positions).length?'preset':'breadthfirst',directed:true,padding:70,spacingFactor:1.35}})
cy.on('tap','node',e=>emit('select',e.target.id()));cy.on('dragfree','node',()=>emit('positions',Object.fromEntries(cy.nodes().map(n=>[n.id(),n.position()]))))})
watch(()=>[props.people,props.relationships,props.visibleIds],draw,{deep:true});watch(()=>props.selectedId,select);onBeforeUnmount(()=>cy?.destroy())
</script>
<style scoped>.tree-canvas{position:absolute;inset:0;background-color:var(--bg-primary);background-image:radial-gradient(circle,var(--border-strong) 1px,transparent 1px);background-size:22px 22px}</style>