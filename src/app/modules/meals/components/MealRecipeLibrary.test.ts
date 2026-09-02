// @vitest-environment jsdom
import { createApp, nextTick, type App } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MealRecipeLibrary from './MealRecipeLibrary.vue'
import type { MealRecipe } from '../types/meals.types'
const recipe: MealRecipe = { id: 'r1', workspaceId: 'w', title: 'Обед', mealType: 'lunch', servings: 2, imageUrl: '', instructions: '', ingredients: [{ id: 'i', name: 'Свёкла', amount: 400, unit: 'g', nutritionPer100g: null, source: 'manual', sourceId: '' }], nutritionPerServing: { calories: null, protein: null, fat: null, carbs: null }, archivedAt: null, createdAt: '', updatedAt: '' }
let app: App | undefined
afterEach(() => { app?.unmount(); document.body.replaceChildren() })
describe('recipe library navigation', () => {
  it('finds dishes by ingredient, exposes composition and edits the selected recipe', async () => {
    const edit = vi.fn()
    const host = document.createElement('div'); document.body.append(host)
    app = createApp(MealRecipeLibrary, { recipes: [recipe, { ...recipe, id: 'popular:2', title: 'Каша', ingredients: [] }], isAdmin: false, onEdit: edit }); app.mount(host)
    expect(host.textContent).toContain('Ингредиенты на 2 порц.')
    expect(host.textContent).toContain('400 г')
    const search = host.querySelector<HTMLInputElement>('input')!
    search.value = 'свекла'; search.dispatchEvent(new Event('input', { bubbles: true })); await nextTick()
    expect(host.querySelectorAll('.library-list button')).toHaveLength(1)
    ;[...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Изменить состав'))!.click()
    expect(edit).toHaveBeenCalledWith(recipe)
    expect(host.querySelector('select')).toBeNull()
  })
  it('selects a popular recipe and offers a copy, not destructive editing', async () => {
    const copy = vi.fn()
    const host = document.createElement('div'); document.body.append(host)
    const popular = { ...recipe, id: 'popular:2', title: 'Каша' }
    app = createApp(MealRecipeLibrary, { recipes: [recipe, popular], isAdmin: false, onCopy: copy }); app.mount(host)
    host.querySelectorAll<HTMLButtonElement>('.library-list button')[1].click(); await nextTick()
    expect(host.querySelector('[aria-label="Удалить блюдо"]')).toBeNull()
    ;[...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Сохранить себе'))!.click()
    expect(copy).toHaveBeenCalledWith(popular)
  })
})
