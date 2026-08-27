import { computed, ref, watch } from 'vue'

const PROGRESS_KEY = 'workspace-calendar:knowledge-base:completed'
const DEFAULT_SECTIONS = ['Учёба', 'Работа', 'Проекты', 'Личное']

function readCompletedIds() {
  if (typeof localStorage === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('ru')
}

export function extractWikiLinks(content) {
  return [...String(content || '').matchAll(/\[\[([^\]]+)\]\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean)
}

export function estimateReadingMinutes(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 180))
}

export function useKnowledgeBase(notes) {
  const search = ref('')
  const activeSection = ref('all')
  const activeFilter = ref('all')
  const completedIds = ref(readCompletedIds())

  const sections = computed(() => {
    const counts = new Map(DEFAULT_SECTIONS.map((name) => [name, 0]))
    notes.value.forEach((note) => counts.set(note.section, (counts.get(note.section) || 0) + 1))
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([name, count]) => ({ name, count }))
  })

  const allTags = computed(() => {
    const counts = new Map()
    notes.value.forEach((note) => (note.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)))
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))
  })

  const filteredNotes = computed(() => {
    const query = normalize(search.value)
    return notes.value.filter((note) => {
      if (activeSection.value !== 'all' && note.section !== activeSection.value) return false
      if (activeFilter.value === 'pinned' && !note.pinned) return false
      if (activeFilter.value === 'learning' && completedIds.value.includes(note.id)) return false
      if (activeFilter.value === 'completed' && !completedIds.value.includes(note.id)) return false
      if (!query) return true
      return normalize([note.title, note.content, note.section, ...(note.tags || [])].join(' ')).includes(query)
    })
  })

  const completedCount = computed(() => notes.value.filter((note) => completedIds.value.includes(note.id)).length)
  const learningProgress = computed(() => notes.value.length
    ? Math.round((completedCount.value / notes.value.length) * 100)
    : 0)

  function toggleCompleted(noteId) {
    completedIds.value = completedIds.value.includes(noteId)
      ? completedIds.value.filter((id) => id !== noteId)
      : [...completedIds.value, noteId]
  }

  function getRelatedNotes(note) {
    if (!note) return []
    const links = new Set(extractWikiLinks(note.content).map(normalize))
    const currentTitle = normalize(note.title)
    return notes.value.filter((candidate) => {
      if (candidate.id === note.id) return false
      const candidateLinks = extractWikiLinks(candidate.content).map(normalize)
      const explicitlyLinked = links.has(normalize(candidate.title)) || candidateLinks.includes(currentTitle)
      const sharedTags = (candidate.tags || []).some((tag) => (note.tags || []).includes(tag))
      return explicitlyLinked || sharedTags
    }).slice(0, 5)
  }

  watch(completedIds, (value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PROGRESS_KEY, JSON.stringify(value))
  }, { deep: true })

  return {
    search,
    activeSection,
    activeFilter,
    sections,
    allTags,
    filteredNotes,
    completedIds,
    completedCount,
    learningProgress,
    toggleCompleted,
    getRelatedNotes,
  }
}
