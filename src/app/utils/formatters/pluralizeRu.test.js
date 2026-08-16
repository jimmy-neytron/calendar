import { describe, expect, it } from 'vitest'
import { pluralizeRu } from './pluralizeRu.js'

describe('русские формы множественного числа', () => {
  const forms = ['платёж', 'платежа', 'платежей']

  it.each([
    [1, 'платёж'], [2, 'платежа'], [5, 'платежей'],
    [11, 'платежей'], [21, 'платёж'], [24, 'платежа'],
  ])('выбирает форму для %s', (value, expected) => {
    expect(pluralizeRu(value, forms)).toBe(expected)
  })
})
