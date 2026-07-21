<template>
  <div class="tree-canvas-shell">
    <div ref="host" class="tree-canvas" aria-label="Интерактивное семейное дерево" />

    <div class="tree-canvas-controls" aria-label="Управление масштабом">
      <UiIconButton icon="plus" label="Приблизить" @click="zoomBy(1.4)" />
      <UiIconButton icon="minus" label="Отдалить" @click="zoomBy(1 / 1.4)" />
      <UiIconButton icon="grid" label="Показать всё дерево" @click="fitTree" />
    </div>
  </div>
</template>

<script setup>
import cytoscape from 'cytoscape'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import UiIconButton from '../ui/UiIconButton.vue'

const props = defineProps({
  people: { type: Array, default: () => [] },
  relationships: { type: Array, default: () => [] },
  positions: { type: Object, default: () => ({}) },
  selectedId: { type: String, default: '' },
  visibleIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['select', 'positions'])
const host = ref(null)
let cy = null
let initialLayoutCompleted = false

function personData(person) {
  const name = [person.lastName, person.firstName, person.patronymic].filter(Boolean).join(' ')
  const years = formatLifeYears(person)
  return {
    id: person.id,
    label: years ? `${name}\n${years}` : name,
    gender: person.gender || 'other',
    living: person.deathDate ? 'false' : 'true',
    kind: person.photo ? 'photo' : 'compact',
    photo: person.photo || '',
  }
}

function relationshipData(relationship) {
  return {
    id: relationship.id,
    source: relationship.from,
    target: relationship.to,
    type: relationship.type || 'parent',
  }
}

function formatLifeYears(person) {
  const birthYear = String(person.birthDate || '').slice(0, 4)
  const deathYear = String(person.deathDate || '').slice(0, 4)
  if (!birthYear && !deathYear) return ''
  return `${birthYear || '?'} — ${deathYear || 'н. в.'}`
}

function initialPosition(person, index) {
  const saved = props.positions?.[person.id]
  if (isPosition(saved)) return saved
  return {
    x: 120 + (index % 5) * 190,
    y: 100 + Math.floor(index / 5) * 145,
  }
}

function initialElements() {
  return [
    ...props.people.map((person, index) => ({
      group: 'nodes',
      data: personData(person),
      position: initialPosition(person, index),
    })),
    ...props.relationships.map((relationship) => ({
      group: 'edges',
      data: relationshipData(relationship),
    })),
  ]
}

function syncGraph() {
  if (!cy) return

  const peopleById = new Map(props.people.map((person) => [person.id, person]))
  const relationshipsById = new Map(props.relationships.map((item) => [item.id, item]))
  let addedNode = false

  cy.batch(() => {
    cy.nodes().forEach((node) => {
      if (!peopleById.has(node.id())) node.remove()
    })

    props.people.forEach((person, index) => {
      const existing = cy.getElementById(person.id)
      if (existing.length) {
        existing.data(personData(person))
        return
      }

      cy.add({
        group: 'nodes',
        data: personData(person),
        position: positionForNewPerson(person, index),
      })
      addedNode = true
    })

    cy.edges().forEach((edge) => {
      if (!relationshipsById.has(edge.id())) edge.remove()
    })

    props.relationships.forEach((relationship) => {
      if (!peopleById.has(relationship.from) || !peopleById.has(relationship.to)) return
      const existing = cy.getElementById(relationship.id)
      const data = relationshipData(relationship)
      if (existing.length) {
        if (existing.source().id() !== data.source || existing.target().id() !== data.target) {
          existing.move({ source: data.source, target: data.target })
        }
        existing.data('type', data.type)
      } else {
        cy.add({ group: 'edges', data })
      }
    })
  })

  applyVisibility()
  applySelection()

  // Новому человеку назначается координата рядом с родственником и сразу
  // сохраняется. Полный layout при этом не запускается.
  if (addedNode && initialLayoutCompleted) {
    window.requestAnimationFrame(emitPositions)
  }
}

function positionForNewPerson(person, index) {
  const saved = props.positions?.[person.id]
  if (isPosition(saved)) return saved

  const relationship = props.relationships.find(
    (item) => item.from === person.id || item.to === person.id
  )
  const relativeId = relationship
    ? (relationship.from === person.id ? relationship.to : relationship.from)
    : ''
  const relative = relativeId ? cy.getElementById(relativeId) : null

  if (relative?.length) {
    const anchor = relative.position()
    const direction = index % 2 === 0 ? 1 : -1
    return { x: anchor.x + direction * 185, y: anchor.y + 135 }
  }

  const extent = cy.extent()
  return {
    x: (extent.x1 + extent.x2) / 2 + (index % 3) * 42,
    y: (extent.y1 + extent.y2) / 2 + (index % 2) * 42,
  }
}

function applyVisibility() {
  if (!cy) return
  const visible = new Set(props.visibleIds)
  cy.nodes().forEach((node) => node.toggleClass('filtered', !visible.has(node.id())))
}

function applySelection() {
  if (!cy) return
  cy.nodes().removeClass('selected')
  const node = cy.getElementById(props.selectedId)
  if (node.length) node.addClass('selected')
}

function emitPositions() {
  if (!cy) return
  emit('positions', Object.fromEntries(
    cy.nodes().map((node) => [node.id(), roundPosition(node.position())])
  ))
}

function roundPosition(position) {
  return {
    x: Math.round(Number(position.x) * 10) / 10,
    y: Math.round(Number(position.y) * 10) / 10,
  }
}

function isPosition(value) {
  return Number.isFinite(Number(value?.x)) && Number.isFinite(Number(value?.y))
}

function zoomBy(factor) {
  if (!cy) return
  const nextZoom = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor))
  cy.zoom({
    level: nextZoom,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
  })
}

function fitTree() {
  if (!cy) return
  const visibleNodes = cy.nodes().filter((node) => !node.hasClass('filtered'))
  if (!visibleNodes.length) return

  cy.fit(visibleNodes, 90)
  if (visibleNodes.length <= 3 && cy.zoom() > 1.15) {
    cy.zoom(1.15)
    cy.center(visibleNodes)
  }
}

onMounted(() => {
  cy = cytoscape({
    container: host.value,
    elements: initialElements(),
    minZoom: 0.08,
    maxZoom: 6,
    wheelSensitivity: 0.72,
    boxSelectionEnabled: false,
    style: [
      {
        selector: 'node',
        style: {
          width: 190,
          height: 74,
          shape: 'round-rectangle',
          'background-color': '#171c27',
          'background-fill': 'linear-gradient',
          'background-gradient-stop-colors': '#232c3d #131925',
          'background-gradient-direction': 'to-bottom-right',
          'border-width': 2,
          'border-color': '#667085',
          label: 'data(label)',
          color: '#f8fafc',
          'font-size': 12,
          'font-weight': 700,
          'line-height': 1.45,
          'text-wrap': 'wrap',
          'text-max-width': 164,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-margin-y': 0,
          'text-background-opacity': 0,
          'shadow-blur': 16,
          'shadow-color': '#020617',
          'shadow-opacity': 0.34,
          'shadow-offset-y': 6,
          'transition-property': 'border-color, border-width, shadow-opacity, width, height',
          'transition-duration': '160ms',
        },
      },
      {
        selector: 'node[kind="photo"]',
        style: {
          width: 148,
          height: 152,
          'background-image': 'data(photo)',
          'background-fit': 'cover',
          'background-clip': 'node',
          'background-opacity': 1,
          'text-max-width': 124,
          'text-valign': 'bottom',
          'text-margin-y': -12,
          'text-background-color': '#0b0f18',
          'text-background-opacity': 0.88,
          'text-background-padding': 6,
          'text-background-shape': 'roundrectangle',
        },
      },
      {
        selector: 'node[gender="female"]',
        style: { 'border-color': '#d86aa3' },
      },
      {
        selector: 'node[gender="male"]',
        style: { 'border-color': '#4f93d2' },
      },
      {
        selector: 'node[gender="other"]',
        style: { 'border-color': '#9b87db' },
      },
      {
        selector: 'node.selected',
        style: {
          'z-index': 999,
          'border-width': 5,
          'border-color': '#ffffff',
          'underlay-color': '#8b5cf6',
          'underlay-opacity': 0.42,
          'underlay-padding': 13,
          'shadow-blur': 30,
          'shadow-color': '#8b5cf6',
          'shadow-opacity': 0.92,
          'shadow-offset-y': 0,
          'font-size': 13,
        },
      },
      {
        selector: 'node.filtered',
        style: { display: 'none' },
      },
      {
        selector: 'edge',
        style: {
          width: 2.2,
          'line-color': '#596273',
          'target-arrow-color': '#596273',
          'target-arrow-shape': 'triangle',
          'arrow-scale': 0.8,
          'curve-style': 'taxi',
          'taxi-direction': 'downward',
          'taxi-turn': 32,
          opacity: 0.86,
        },
      },
      {
        selector: 'edge[type="partner"]',
        style: {
          'line-style': 'dashed',
          'target-arrow-shape': 'none',
          'line-color': '#d86aa3',
          'taxi-direction': 'horizontal',
        },
      },
    ],
    layout: { name: 'preset' },
  })

  cy.on('tap', 'node', (event) => emit('select', event.target.id()))
  cy.on('dragfree', 'node', emitPositions)
  applyVisibility()
  applySelection()

  const hasStoredPositions = props.people.some((person) => isPosition(props.positions?.[person.id]))
  if (!hasStoredPositions && props.people.length) {
    const layout = cy.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 90,
      spacingFactor: 1.5,
      animate: false,
    })
    layout.one('layoutstop', () => {
      initialLayoutCompleted = true
      emitPositions()
      fitTree()
    })
    layout.run()
  } else {
    initialLayoutCompleted = true
    window.requestAnimationFrame(fitTree)
  }
})

watch(() => props.people, syncGraph, { deep: true })
watch(() => props.relationships, syncGraph, { deep: true })
watch(() => props.visibleIds, applyVisibility, { deep: true })
watch(() => props.selectedId, applySelection)

onBeforeUnmount(() => cy?.destroy())
</script>

<style scoped>
.tree-canvas-shell,
.tree-canvas {
  position: absolute;
  inset: 0;
}

.tree-canvas {
  background-color: var(--bg-primary);
  background-image:
    radial-gradient(circle at 50% 15%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 42%),
    radial-gradient(circle, var(--border-strong) 1px, transparent 1px);
  background-size: auto, 24px 24px;
}

.tree-canvas-controls {
  position: absolute;
  top: 14px;
  left: 14px;
  display: grid;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: color-mix(in srgb, var(--sidebar-floating-bg) 92%, transparent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
}
</style>
