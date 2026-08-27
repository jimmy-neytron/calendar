<template>
  <section class="knowledge-graph">
    <div v-if="notes.length" class="graph-stage">
      <header class="graph-heading"><span>Граф знаний</span><strong>{{ notes.length }} материалов · {{ sectionCount }} разделов · {{ relationCount }} связей</strong></header>
      <div class="graph-toolbar" aria-label="Управление графом"><button type="button" title="Приблизить" @click="zoomBy(1.28)"><UiIcon name="plus" /></button><button type="button" title="Отдалить" @click="zoomBy(.78)"><UiIcon name="minus" /></button><button type="button" title="Показать весь граф" @click="fitGraph"><UiIcon name="target" /></button></div>
      <div ref="graphElement" class="graph-canvas" />
      <Transition name="focus-card">
        <aside v-if="focusedItem" class="graph-focus-card">
          <span :class="['focus-dot', focusedItem.type]" />
          <div><small>{{ focusedItem.type === 'section' ? 'Раздел' : focusedItem.section }}</small><strong>{{ focusedItem.label }}</strong><p>{{ focusedConnectionCount }} {{ connectionWord }}</p></div>
          <button type="button" @click="openFocused">Открыть <UiIcon name="right" /></button>
          <button class="focus-close" type="button" aria-label="Снять выделение" @click="clearFocus">×</button>
        </aside>
      </Transition>
      <div class="graph-footer"><div class="graph-legend"><span><i class="note" />Материал</span><span><i class="section" />Раздел</span><span><i class="link" />Прямая связь</span></div><p>Нажми на точку, чтобы увидеть её окружение · колесо — масштаб</p></div>
    </div>
    <div v-else class="graph-empty"><UiIcon name="network" /><strong>Граф пока пуст</strong><p>Добавь материалы — разделы и связи появятся автоматически.</p></div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import cytoscape from 'cytoscape'
import UiIcon from '../../../components/ui/UiIcon.vue'
import { extractWikiLinks } from '../composables/useKnowledgeBase.js'

const props = defineProps({ notes: { type: Array, default: () => [] }, activeNoteId: { type: String, default: '' } })
const emit = defineEmits(['select', 'select-section'])
const graphElement = ref(null)
const focusedNodeId = ref('')
const focusedConnectionCount = ref(0)
const relationTotal = ref(0)
let graph = null
let resizeObserver = null
let wheelFrame = 0
let targetZoom = 1
let zoomPoint = { x: 0, y: 0 }

const sectionCount = computed(() => new Set(props.notes.map((note) => note.section)).size)
const relationCount = computed(() => relationTotal.value)
const focusedItem = computed(() => {
  if (!focusedNodeId.value) return null
  if (focusedNodeId.value.startsWith('section:')) return { type: 'section', label: focusedNodeId.value.slice(8), section: '' }
  const note = props.notes.find((item) => item.id === focusedNodeId.value)
  return note ? { type: 'note', label: note.title, section: note.section } : null
})
const connectionWord = computed(() => {
  const count = focusedConnectionCount.value
  if (count % 100 >= 11 && count % 100 <= 14) return 'связей'
  if (count % 10 === 1) return 'связь'
  if (count % 10 >= 2 && count % 10 <= 4) return 'связи'
  return 'связей'
})

function normalize(value) { return String(value || '').trim().toLocaleLowerCase('ru') }

function buildElements() {
  const titleMap = new Map(props.notes.map((note) => [normalize(note.title), note.id]))
  const sections = [...new Set(props.notes.map((note) => note.section))]
  const nodes = sections.map((section) => ({ data: { id: `section:${section}`, label: section, type: 'section' }, classes: 'section' }))
  props.notes.forEach((note) => nodes.push({ data: { id: note.id, label: note.title, section: note.section, type: 'note' }, classes: `note ${note.id === props.activeNoteId ? 'active' : ''}` }))
  const edges = new Map()
  const addEdge = (source, target, type) => {
    if (!target || source === target) return
    const pair = [source, target].sort()
    const key = `${type}:${pair[0]}:${pair[1]}`
    if (!edges.has(key)) edges.set(key, { data: { id: key, source, target, type }, classes: type })
  }
  props.notes.forEach((note) => addEdge(`section:${note.section}`, note.id, 'section-edge'))
  props.notes.forEach((note) => extractWikiLinks(note.content).forEach((title) => addEdge(note.id, titleMap.get(normalize(title)), 'wiki-link')))
  props.notes.forEach((note, index) => props.notes.slice(index + 1).forEach((candidate) => {
    if ((note.tags || []).some((tag) => (candidate.tags || []).includes(tag))) addEdge(note.id, candidate.id, 'tag-link')
  }))
  relationTotal.value = [...edges.values()].filter((edge) => edge.classes !== 'section-edge').length
  return [...nodes, ...edges.values()]
}

const graphStyles = () => [
  { selector: 'node', style: { label: 'data(label)', width: 7, height: 7, 'background-color': '#94a3b8', 'border-width': 1, 'border-color': '#64748b', color: '#94a3b8', 'font-size': 7, 'font-weight': 500, 'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 5, 'text-wrap': 'ellipsis', 'text-max-width': 120, 'min-zoomed-font-size': 4, 'text-background-color': '#09090b', 'text-background-opacity': .72, 'text-background-padding': 2, 'overlay-opacity': 0, 'transition-property': 'width, height, background-color, border-color, opacity', 'transition-duration': '180ms' } },
  { selector: 'node.section', style: { width: 12, height: 12, 'background-color': '#8b5cf6', 'border-width': 2, 'border-color': '#c4b5fd', color: '#c4b5fd', 'font-size': 8, 'font-weight': 750 } },
  { selector: 'node.active', style: { width: 12, height: 12, 'background-color': '#a78bfa', 'border-width': 3, 'border-color': '#ede9fe', color: '#ddd6fe' } },
  { selector: 'node.focused', style: { width: 18, height: 18, 'background-color': '#8b5cf6', 'border-width': 4, 'border-color': '#ddd6fe', color: '#ddd6fe', 'font-size': 7, 'font-weight': 700, 'underlay-color': '#8b5cf6', 'underlay-opacity': .2, 'underlay-padding': 9, 'z-index': 20 } },
  { selector: 'node.connected', style: { width: 10, height: 10, 'background-color': '#c4b5fd', 'border-color': '#8b5cf6', color: '#c4b5fd', 'z-index': 10 } },
  { selector: 'edge', style: { width: .55, 'line-color': '#64748b', 'curve-style': 'bezier', opacity: .28, 'overlay-opacity': 0, 'transition-property': 'width, line-color, opacity', 'transition-duration': '180ms' } },
  { selector: 'edge.section-edge', style: { width: .65, 'line-color': '#8b5cf6', opacity: .3 } },
  { selector: 'edge.wiki-link', style: { width: 1.4, 'line-color': '#a78bfa', opacity: .72 } },
  { selector: 'edge.tag-link', style: { width: .45, 'line-style': 'dashed', 'line-color': '#64748b', opacity: .22 } },
  { selector: '.connected', style: { opacity: 1 } },
  { selector: 'edge.connected', style: { width: 1.5, 'line-color': '#8b5cf6', opacity: .9, 'z-index': 8 } },
  { selector: '.faded', style: { opacity: .075 } },
]

async function renderGraph() {
  await nextTick()
  if (!graphElement.value || !props.notes.length) return
  destroyGraph()
  graph = cytoscape({
    container: graphElement.value,
    elements: buildElements(),
    minZoom: .04,
    maxZoom: 8,
    userZoomingEnabled: false,
    motionBlur: true,
    textureOnViewport: true,
    style: graphStyles(),
    layout: { name: 'cose', animate: false, fit: true, padding: 110, randomize: true, nodeRepulsion: 7200, idealEdgeLength: 105, edgeElasticity: 70, nestingFactor: .7, gravity: .08, componentSpacing: 140, numIter: 2200 },
  })
  graph.zoom(Math.max(graph.minZoom(), graph.zoom() * .82))
  graph.center()
  targetZoom = graph.zoom()
  graph.on('tap', 'node', (event) => focusNode(event.target.id()))
  graph.on('tap', (event) => { if (event.target === graph) clearFocus() })
  graph.on('mouseover', 'node', () => { if (graphElement.value) graphElement.value.style.cursor = 'pointer' })
  graph.on('mouseout', 'node', () => { if (graphElement.value) graphElement.value.style.cursor = 'grab' })
  graphElement.value.addEventListener('wheel', handleWheel, { passive: false })
  if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(() => graph?.resize()); resizeObserver.observe(graphElement.value) }
  if (props.activeNoteId && graph.getElementById(props.activeNoteId).length) focusNode(props.activeNoteId)
}

function focusNode(id) {
  if (!graph) return
  const node = graph.getElementById(id)
  if (!node.length) return
  graph.elements().removeClass('focused connected faded')
  const neighborhood = node.closedNeighborhood()
  graph.elements().not(neighborhood).addClass('faded')
  neighborhood.addClass('connected')
  node.removeClass('connected').addClass('focused')
  focusedNodeId.value = id
  focusedConnectionCount.value = node.connectedEdges().length
  graph.animate({ center: { eles: node }, zoom: Math.max(graph.zoom(), Math.min(1.35, graph.maxZoom())), duration: 380, easing: 'ease-out-cubic' })
  window.setTimeout(() => { targetZoom = graph?.zoom() || 1 }, 400)
}

function clearFocus() { graph?.elements().removeClass('focused connected faded'); focusedNodeId.value = ''; focusedConnectionCount.value = 0 }
function openFocused() { if (!focusedItem.value) return; focusedItem.value.type === 'section' ? emit('select-section', focusedItem.value.label) : emit('select', focusedNodeId.value) }
function handleWheel(event) {
  event.preventDefault()
  if (!graph || !graphElement.value) return
  const rect = graphElement.value.getBoundingClientRect()
  zoomPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  targetZoom = Math.min(graph.maxZoom(), Math.max(graph.minZoom(), targetZoom * Math.exp(-event.deltaY * .0018)))
  if (!wheelFrame) wheelFrame = requestAnimationFrame(applyInertialZoom)
}
function applyInertialZoom() {
  if (!graph) return
  const next = graph.zoom() + (targetZoom - graph.zoom()) * .11
  graph.zoom({ level: next, renderedPosition: zoomPoint })
  if (Math.abs(targetZoom - next) > .0008) wheelFrame = requestAnimationFrame(applyInertialZoom)
  else wheelFrame = 0
}
function zoomBy(multiplier) { if (!graph) return; targetZoom = Math.min(graph.maxZoom(), Math.max(graph.minZoom(), graph.zoom() * multiplier)); zoomPoint = { x: graph.width() / 2, y: graph.height() / 2 }; if (!wheelFrame) wheelFrame = requestAnimationFrame(applyInertialZoom) }
function fitGraph() { if (!graph) return; clearFocus(); graph.animate({ fit: { eles: graph.elements(), padding: 95 }, duration: 480, easing: 'ease-out-cubic' }); window.setTimeout(() => { targetZoom = graph?.zoom() || 1 }, 500) }
function destroyGraph() { if (graphElement.value) graphElement.value.removeEventListener('wheel', handleWheel); resizeObserver?.disconnect(); resizeObserver = null; if (wheelFrame) cancelAnimationFrame(wheelFrame); wheelFrame = 0; graph?.destroy(); graph = null }

watch(() => [props.notes, props.activeNoteId], renderGraph, { deep: true })
onMounted(renderGraph)
onBeforeUnmount(destroyGraph)
</script>

<style scoped>
.knowledge-graph{min-width:0;min-height:0;padding:10px;background:var(--card-solid)}
.graph-stage{position:relative;width:100%;height:100%;min-height:500px;border:1px solid var(--border-color);border-radius:16px;overflow:hidden;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--accent) 7%,transparent),transparent 42%),var(--card-solid)}
.graph-canvas{position:absolute;inset:0;cursor:grab}.graph-canvas:active{cursor:grabbing}
.graph-heading,.graph-toolbar,.graph-footer,.graph-focus-card{position:absolute;z-index:3}
.graph-heading{top:14px;left:16px;display:grid;gap:3px;pointer-events:none}.graph-heading span{color:var(--text-primary);font-size:13px;font-weight:800}.graph-heading strong{color:var(--text-muted);font-size:8px;font-weight:550}
.graph-toolbar{top:12px;right:12px;display:flex;gap:2px;border:1px solid var(--border-color);border-radius:10px;padding:3px;background:color-mix(in srgb,var(--card-solid) 88%,transparent);box-shadow:var(--shadow-sm);backdrop-filter:blur(14px)}
.graph-toolbar button{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:7px;color:var(--text-secondary);background:transparent}.graph-toolbar button:hover{color:var(--accent);background:var(--accent-soft)}
.graph-footer{right:14px;bottom:12px;left:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;pointer-events:none}.graph-footer p{margin:0;color:var(--text-muted);font-size:8px}
.graph-legend{display:flex;align-items:center;gap:12px;border:1px solid var(--border-color);border-radius:9px;padding:7px 9px;color:var(--text-muted);background:color-mix(in srgb,var(--card-solid) 86%,transparent);font-size:8px;backdrop-filter:blur(12px)}.graph-legend span{display:flex;align-items:center;gap:5px}.graph-legend i{width:7px;height:7px;border:1px solid #64748b;border-radius:50%;background:#94a3b8}.graph-legend i.section{width:10px;height:10px;border-color:#c4b5fd;background:#8b5cf6}.graph-legend i.link{width:18px;height:2px;border:0;border-radius:99px;background:#a78bfa}
.graph-focus-card{bottom:48px;left:50%;width:min(430px,calc(100% - 28px));display:grid;grid-template-columns:12px minmax(0,1fr) auto 20px;align-items:center;gap:10px;border:1px solid var(--accent-border);border-radius:13px;padding:9px 9px 9px 12px;background:color-mix(in srgb,var(--card-solid) 92%,transparent);box-shadow:var(--shadow-lg);backdrop-filter:blur(18px);transform:translateX(-50%)}
.focus-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8;box-shadow:0 0 0 3px color-mix(in srgb,#94a3b8 22%,transparent)}.focus-dot.section{width:11px;height:11px;background:#8b5cf6;box-shadow:0 0 0 4px color-mix(in srgb,#8b5cf6 22%,transparent)}
.graph-focus-card div{min-width:0}.graph-focus-card small,.graph-focus-card strong,.graph-focus-card p{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.graph-focus-card small{color:var(--accent);font-size:7px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.graph-focus-card strong{margin-top:2px;color:var(--text-primary);font-size:10px}.graph-focus-card p{margin:2px 0 0;color:var(--text-muted);font-size:8px}
.graph-focus-card>button:not(.focus-close){display:flex;align-items:center;gap:4px;border:0;border-radius:8px;padding:8px 10px;color:var(--accent);background:var(--accent-soft);font-size:8px;font-weight:800}.focus-close{width:20px;height:20px;border:0;padding:0;color:var(--text-muted);background:transparent;font-size:16px}
.focus-card-enter-active,.focus-card-leave-active{transition:opacity .18s ease,transform .18s ease}.focus-card-enter-from,.focus-card-leave-to{opacity:0;transform:translate(-50%,8px)}
.graph-empty{width:100%;height:100%;min-height:500px;display:grid;place-items:center;align-content:center;gap:7px;border:1px dashed var(--accent-border);border-radius:16px;color:var(--text-muted);background:var(--card-solid);text-align:center}.graph-empty svg{font-size:30px}.graph-empty p{margin:0}
@media(max-width:700px){.knowledge-graph{min-height:640px;padding:0}.graph-stage{border-radius:0}.graph-footer p{display:none}.graph-legend span:nth-child(3){display:none}.graph-focus-card{bottom:52px}}
</style>
