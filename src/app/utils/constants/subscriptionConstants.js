export const SUBSCRIPTION_TIERS = {
    free: {
        id: 'free',
        name: 'Free',
        price: '$0',
        period: 'навсегда',
        workspaceLimit: 1,
        icon: 'calendar',
    },
    plus: {
        id: 'plus',
        name: 'Plus',
        price: '$4.99',
        period: 'в месяц',
        workspaceLimit: 3,
        icon: 'star',
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
        birthdays: true,
        ideas: true,
        budget: false,
        timeTracking: false,
        sport: false,
        movies: false,
    },
    plus: {
        birthdays: true,
        ideas: true,
        budget: true,
        timeTracking: true,
        sport: true,
        movies: true,
    },
    pro: {
        birthdays: true,
        ideas: true,
        budget: true,
        timeTracking: true,
        sport: true,
        movies: true,
    },
}

export function normalizeSubscriptionTier(value) {
    const tier = String(value || '').toLowerCase()
    return SUBSCRIPTION_TIERS[tier] ? tier : 'pro'
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
    return getSubscriptionFeatureMap(value)?.[feature] !== false
}
