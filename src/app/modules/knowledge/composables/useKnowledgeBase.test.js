import { describe, expect, it } from 'vitest'
import { estimateReadingMinutes, extractWikiLinks } from './useKnowledgeBase.js'

describe('knowledge base helpers', () => {
  it('extracts Obsidian-style links and ignores empty links', () => {
    expect(extractWikiLinks('Смотри [[Vue 3]] и [[ Composition API ]], но не [[]].'))
      .toEqual(['Vue 3', 'Composition API'])
  })

  it('estimates at least one minute of reading time', () => {
    expect(estimateReadingMinutes('Короткая заметка')).toBe(1)
    expect(estimateReadingMinutes(Array(181).fill('слово').join(' '))).toBe(2)
  })
})
