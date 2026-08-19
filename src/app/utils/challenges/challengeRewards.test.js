import { describe, expect, it } from 'vitest'
import { buildRewardsCollection } from './challengeRewards.js'

describe('глобальная коллекция наград челленджей', () => {
  it('всегда возвращает каталог из 30 наград', () => {
    const rewards = buildRewardsCollection([])

    expect(rewards).toHaveLength(30)
    expect(rewards.every((reward) => !reward.unlocked)).toBe(true)
  })

  it('считает достижения сразу по всем челленджам', () => {
    const rewards = buildRewardsCollection([
      { targetDays: 4, completedDates: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-05'] },
      { targetDays: 10, completedDates: ['2026-08-01', '2026-08-02'] },
    ])
    const reward = (id) => rewards.find((item) => item.id === id)

    expect(reward('activity-3').unlocked).toBe(true)
    expect(reward('streak-3').unlocked).toBe(true)
    expect(reward('started-1').current).toBe(2)
    expect(reward('completed-1').unlocked).toBe(true)
    expect(reward('parallel-2').unlocked).toBe(true)
    expect(reward('started-3').unlocked).toBe(false)
  })
})
