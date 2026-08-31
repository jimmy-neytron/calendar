import { describe, expect, it } from 'vitest'
import {
  getSubscriptionPlan,
  isSubscriptionFeatureEnabled,
  normalizeSubscriptionTier,
  SUBSCRIPTION_TIERS,
} from './subscriptionConstants.js'

describe('subscription tiers', () => {
  it('exposes only Free and Pro plans', () => {
    expect(Object.keys(SUBSCRIPTION_TIERS)).toEqual(['free', 'pro'])
  })

  it('keeps the four core products on Free', () => {
    expect(isSubscriptionFeatureEnabled('free', 'calendar')).toBe(true)
    expect(isSubscriptionFeatureEnabled('free', 'budget')).toBe(true)
    expect(isSubscriptionFeatureEnabled('free', 'birthdays')).toBe(true)
    expect(isSubscriptionFeatureEnabled('free', 'ideas')).toBe(true)
  })

  it('keeps Pro-only products closed on Free', () => {
    expect(isSubscriptionFeatureEnabled('free', 'analytics')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'workspace')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'integrations')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'extraSections')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'purchases')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'knowledge')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'meals')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'investments')).toBe(false)
    expect(isSubscriptionFeatureEnabled('free', 'coupons')).toBe(false)
    expect(isSubscriptionFeatureEnabled('pro', 'purchases')).toBe(true)
    expect(isSubscriptionFeatureEnabled('pro', 'knowledge')).toBe(true)
    expect(isSubscriptionFeatureEnabled('pro', 'meals')).toBe(true)
    expect(isSubscriptionFeatureEnabled('pro', 'investments')).toBe(true)
    expect(isSubscriptionFeatureEnabled('pro', 'coupons')).toBe(true)
  })

  it('maps legacy Plus users to Pro', () => {
    expect(normalizeSubscriptionTier('plus')).toBe('pro')
    expect(getSubscriptionPlan('plus').id).toBe('pro')
  })
})
