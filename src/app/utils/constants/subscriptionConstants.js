export const SUBSCRIPTION_TIERS = {
    free: {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'навсегда',
        workspaceLimit: 1,
        icon: 'calendar',
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: '$9.99',
        period: 'в месяц',
        workspaceLimit: 10,
        icon: 'wallet',
    },
}

export const SUBSCRIPTION_FEATURES = {
    free: {
        calendar: true,
        birthdays: true,
        ideas: true,
        budget: true,
        workspace: false,
        analytics: false,
        activity: false,
        integrations: false,
        extraSections: false,
        timeTracking: false,
        sport: false,
        movies: false,
        purchases: false,
    },
    pro: {
        calendar: true,
        birthdays: true,
        ideas: true,
        budget: true,
        workspace: true,
        analytics: true,
        activity: true,
        integrations: true,
        extraSections: true,
        timeTracking: true,
        sport: true,
        movies: true,
        purchases: true,
    },
}

export function normalizeSubscriptionTier(value) {
    const tier = String(value || '').toLowerCase()
    if (tier === 'plus') return 'pro'
    return SUBSCRIPTION_TIERS[tier] ? tier : 'free'
}

export function getSubscriptionPlan(value) {
    const tier = normalizeSubscriptionTier(value)
    return SUBSCRIPTION_TIERS[tier]
}

export function getSubscriptionFeatureMap(value) {
    const tier = normalizeSubscriptionTier(value)
    return SUBSCRIPTION_FEATURES[tier]
}

export function isSubscriptionFeatureEnabled(value, feature) {
    return getSubscriptionFeatureMap(value)?.[feature] === true
}
