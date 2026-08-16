import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  UI_ICONS,
  resolveUiButtonIcon,
  resolveUiIcon,
} from './uiIcons.js'

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('контракт UI-иконок', () => {
  it('отрисовывает clock как SVG-иконку, а не текст', () => {
    expect(resolveUiButtonIcon('clock')).toBe('clock')
    expect(resolveUiIcon('clock')).toBe(UI_ICONS.clock)
  })

  it('поддерживает символьные алиасы старых кнопок', () => {
    expect(resolveUiButtonIcon('＋')).toBe('plus')
    expect(resolveUiButtonIcon('✓')).toBe('check')
    expect(resolveUiButtonIcon('⇣')).toBe('download')
  })

  it('имеет валидную геометрию у каждой иконки', () => {
    Object.entries(UI_ICONS).forEach(([name, icon]) => {
      expect(icon.paths?.length || icon.circles?.length, name).toBeTruthy()
    })
  })

  it('содержит все статические иконки, указанные в Vue-компонентах', () => {
    const unknown = []

    vueFiles().forEach((path) => {
      const source = readFileSync(path, 'utf8')
      for (const match of source.matchAll(/<UiIcon\b[^>]*\sname="([^"]+)"/g)) {
        if (!UI_ICONS[match[1]]) unknown.push(`${path}: ${match[1]}`)
      }
      for (const match of source.matchAll(/<UiIconButton\b[^>]*\sicon="([^"]+)"/g)) {
        if (!UI_ICONS[match[1]]) unknown.push(`${path}: ${match[1]}`)
      }
      for (const match of source.matchAll(/<UiButton\b[^>]*\sicon="([^"]+)"/g)) {
        if (!resolveUiButtonIcon(match[1])) unknown.push(`${path}: ${match[1]}`)
      }

      for (const match of source.matchAll(/<UiIcon\b[^>]*\s:name="([^"]+)"/g)) {
        for (const name of quotedIconNames(match[1])) {
          if (!UI_ICONS[name]) unknown.push(`${path}: ${name}`)
        }
      }
      for (const match of source.matchAll(/<UiButton\b[^>]*\s:icon="([^"]+)"/g)) {
        for (const name of quotedIconNames(match[1])) {
          if (!resolveUiButtonIcon(name)) unknown.push(`${path}: ${name}`)
        }
      }
    })

    expect(unknown).toEqual([])
  })
})

function vueFiles() {
  return readdirSync(APP_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.vue'))
    .map((entry) => join(entry.parentPath, entry.name))
}

function quotedIconNames(expression) {
  const direct = expression.match(/^\s*['"]([a-z][a-z-]*)['"]\s*$/)
  if (direct) return [direct[1]]
  return [...expression.matchAll(/[?:]\s*['"]([a-z][a-z-]*)['"]/g)].map((match) => match[1])
}
