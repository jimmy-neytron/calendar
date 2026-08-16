import { describe, expect, it } from 'vitest'
import { formatRubles, parseAmount, toNonNegativeAmount } from './currencyFormatter.js'

describe('форматирование денежных значений', () => {
  it('понимает числа с запятой и безопасно обрабатывает мусор', () => {
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('не число')).toBe(0)
  })

  it('нормализует сумму до двух знаков и не допускает отрицательное значение', () => {
    expect(toNonNegativeAmount('12,345')).toBe(12.35)
    expect(toNonNegativeAmount(-10)).toBe(0)
  })

  it('форматирует рубли единообразно', () => {
    expect(formatRubles(1250)).toContain('1 250')
    expect(formatRubles(-500)).toContain('500')
  })
})
