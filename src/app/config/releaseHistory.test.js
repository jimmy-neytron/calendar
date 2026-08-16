import { describe, expect, it } from 'vitest'
import { mergeReleaseHistory, RELEASE_HISTORY } from './releaseHistory.js'

describe('история обновлений', () => {
  it('содержит последовательные версии от 1.0.0 до текущей 1.9.0', () => {
    expect(RELEASE_HISTORY.at(-1).version).toBe('1.0.0')
    expect(RELEASE_HISTORY[0].version).toBe('1.9.0')
    expect(RELEASE_HISTORY).toHaveLength(10)
  })

  it('у каждой версии есть содержимое для интерфейса', () => {
    RELEASE_HISTORY.forEach((release) => {
      expect(release.title).toBeTruthy()
      expect(release.summary).toBeTruthy()
      expect(release.cards.length).toBeGreaterThan(0)
      expect(release.details.length).toBeGreaterThan(0)
    })
  })

  it('сохраняет пользовательское описание локальной версии и игнорирует старый release-v2', () => {
    const merged = mergeReleaseHistory([
      { id: 'remote', version: '1.9.0', title: 'Обновлённый заголовок' },
      { id: 'legacy', version: 'release-v2', title: 'Старый формат' },
    ])
    expect(merged[0]).toMatchObject({ version: '1.9.0', title: 'Календарь и бюджет стали удобнее' })
    expect(merged.some((release) => release.version === 'release-v2')).toBe(false)
  })
})
