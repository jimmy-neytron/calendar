import { describe, expect, it } from 'vitest'
import { toAmount, useBudgetForm } from './useBudgetForm'

describe('useBudgetForm', () => {
  it('calculates the global monthly template totals', () => {
    const budget = useBudgetForm()

    budget.reset({
      settings: { defaultIncome: 100_000 },
      rules: [
        { title: 'Аренда', defaultAmount: 35_000, dueDay: 5 },
        { title: 'Интернет', defaultAmount: 1_000, dueDay: 10 },
      ],
      categories: [
        { name: 'Продукты', defaultAmount: 20_000 },
        { name: 'Транспорт', defaultAmount: 5_000 },
      ],
    })

    expect(budget.requiredTotal.value).toBe(36_000)
    expect(budget.flexibleTotal.value).toBe(25_000)
    expect(budget.plannedTotal.value).toBe(61_000)
    expect(budget.remaining.value).toBe(39_000)
  })

  it('does not allow a template without an income', () => {
    const budget = useBudgetForm()

    budget.reset({ settings: { defaultIncome: 0 } })

    expect(budget.validate()).toBe('Укажи обычный доход за месяц')
  })

  it('normalizes negative and decimal amounts', () => {
    expect(toAmount('-100')).toBe(0)
    expect(toAmount('1250,55')).toBe(1250.55)
  })
})
