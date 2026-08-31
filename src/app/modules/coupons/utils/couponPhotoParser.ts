import type { CouponDiscountType } from '../../../types/coupon'

export interface ParsedCouponPhoto {
  title?: string
  merchant?: string
  description?: string
  terms?: string
  expiresOn?: string
  discountType?: CouponDiscountType
  discountValue?: number
  discountLabel?: string
}

const merchantPatterns: Array<[RegExp, string]> = [
  [/магн[иi1]т/i, 'Магнит'],
  [/пят[её]рочк/i, 'Пятёрочка'],
  [/перекр[её]сток/i, 'Перекрёсток'],
  [/лент[аы]/i, 'Лента'],
  [/дикси/i, 'Дикси'],
  [/ашан/i, 'Ашан'],
  [/вкусвилл/i, 'ВкусВилл'],
  [/улыбк[аеи]\s+радуг/i, 'Улыбка радуги'],
]

const russianMonths: Record<string, number> = {
  января: 1,
  февраля: 2,
  марта: 3,
  апреля: 4,
  мая: 5,
  июня: 6,
  июля: 7,
  августа: 8,
  сентября: 9,
  октября: 10,
  ноября: 11,
  декабря: 12,
}

export function parseCouponPhotoText(rawText: string): ParsedCouponPhoto {
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(isMeaningfulTextLine)
  if (!lines.length) return {}

  const merchant = findMerchant(lines)
  const expiresOn = findExpiryDate(rawText)
  const dateLineIndex = lines.findIndex((line) => containsDate(line))
  const termsMarkerIndex = lines.findIndex((line) => /купон\s+действует/i.test(line))
  const titleEndIndex = firstFoundIndex(termsMarkerIndex, dateLineIndex, Math.min(lines.length, 25))
  const title = findTitle(lines.slice(0, titleEndIndex), merchant)
  const normalizedTitle = title ? sentenceCase(title).slice(0, 140) : undefined
  const hasTermsAnchor = termsMarkerIndex >= 0 || dateLineIndex >= 0
  const termsStartIndex = firstFoundIndex(termsMarkerIndex, dateLineIndex, 0)
  const termsLines = hasTermsAnchor ? collectTermsLines(lines.slice(termsStartIndex)) : []
  const terms = termsLines.length ? termsLines.join(' ').slice(0, 1200) : undefined
  const discount = findDiscount(buildSafeDiscountText(rawText))

  return compact({
    merchant,
    title: normalizedTitle,
    description: normalizedTitle,
    terms,
    expiresOn,
    ...discount,
  })
}

function firstFoundIndex(...indices: number[]): number {
  return indices.find((index) => index >= 0) ?? 0
}

function collectTermsLines(lines: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const line of lines) {
    if (result.length && /^(?:купон|магазин)$/i.test(line)) break
    if (isCodeOnlyLine(line) || isCorruptedTextLine(line) || isIncompleteTextLine(line)) continue
    const key = line.toLocaleLowerCase('ru-RU').replace(/[^а-яёa-z0-9]+/gi, ' ').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(line)
    if (/регионе\s+его\s+получения/i.test(line)) break
  }
  return result
}

function isCorruptedTextLine(line: string): boolean {
  return !containsDate(line) && /(?:[а-яёa-z]\d|\d[а-яёa-z])/i.test(line)
}

function isIncompleteTextLine(line: string): boolean {
  return /^(?:\*\s*)?купон\s+не\s+действует\s+на$/i.test(line)
}

function buildSafeDiscountText(rawText: string): string {
  return rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => isMeaningfulTextLine(line)
      || /^\d{1,3}\s*%$/.test(line)
      || /^\d+\s*[+хx×]\s*\d+$/i.test(line)
      || /^\d+(?:[.,]\d{1,2})?\s*(?:₽|руб)$/i.test(line))
    .join('\n')
}

function findTitle(lines: string[], merchant?: string): string | undefined {
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isProductLine(line, merchant))
    .sort((left, right) => titleScore(right.line) - titleScore(left.line))
  const best = candidates[0]
  if (!best) return undefined
  let start = best.index
  let end = best.index
  const previousLine = lines[start - 1]
  if (previousLine && isProductLine(previousLine, merchant) && shouldPrependTitleLine(previousLine, lines[start])) start -= 1
  while (end < lines.length - 1 && end - start < 2
    && isProductLine(lines[end + 1], merchant)
    && shouldJoinTitleLines(lines[end], lines[end + 1])) end += 1
  return lines.slice(start, end + 1).join(' ').slice(0, 140)
}

function shouldPrependTitleLine(left: string, right: string): boolean {
  return /(?:,|(?:\s|^)(?:на|для|кроме|без|в|с|из|по))$/i.test(left)
    || /^(?:развес|в\s+чеке|на\s+развес|кроме|для|без|из|по)(?:\s|$)/i.test(right)
}

function shouldJoinTitleLines(left: string, right: string): boolean {
  if (containsDate(right) || /^(?:купон|скидка|магазин|на все|только|позици)(?:\s|$)/i.test(right)) return false
  if (/^(?:в\s+чеке|на\s+развес|кроме|для|без|из|по)(?:\s|$)/i.test(right)) return true
  if (/(?:\s|^)(?:на|для|кроме|без|в|с|из|по)[,.:;]?$/i.test(left)) return true
  return uppercaseRatio(left) >= 0.72 && uppercaseRatio(right) >= 0.72
    && left.length + right.length <= 138
}

function uppercaseRatio(line: string): number {
  const letters = line.match(/[а-яёa-z]/gi) || []
  return letters.length ? (line.match(/[А-ЯЁA-Z]/g)?.length || 0) / letters.length : 0
}

function findMerchant(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 25)) {
    const match = merchantPatterns.find(([pattern]) => pattern.test(line))
    if (match) return match[1]
  }
  return undefined
}

function titleScore(line: string): number {
  const letters = line.match(/[а-яёa-z]/gi) || []
  let score = Math.min(line.length, 90) + uppercaseRatio(line) * 25
  if (/товар/i.test(line)) score += 25
  if (/товар\w*\s+в\s+чек/i.test(line)) score += 35
  if (line.includes(',')) score += 15
  if (/^(?:на все|только|позици|купон действ|в магазинах)/i.test(line)) score -= 30
  return score
}

function findExpiryDate(text: string): string | undefined {
  const currentYear = new Date().getFullYear()
  const numericDates = [...text.matchAll(/\b(0?[1-9]|[12]\d|3[01])[.\/-](0?[1-9]|1[0-2])(?:[.\/-](20\d{2}))?\b/g)]
    .map((match) => ({ day: Number(match[1]), month: Number(match[2]), year: Number(match[3] || currentYear) }))
  const namedDates = [...text.toLocaleLowerCase('ru-RU').matchAll(/\b(?:с\s+\d{1,2}\s+по\s+)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(20\d{2}))?/g)]
    .map((match) => ({ day: Number(match[1]), month: russianMonths[match[2]], year: Number(match[3] || currentYear) }))
  return [...numericDates, ...namedDates]
    .filter(({ day, month, year }) => isValidDate(year, month, day))
    .map(({ day, month, year }) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    .sort()
    .at(-1)
}

function findDiscount(text: string): Pick<ParsedCouponPhoto, 'discountType' | 'discountValue' | 'discountLabel'> {
  const offers = [...text.matchAll(/\b(\d+)\s*[+хx]\s*(\d+)\b/gi)].map((match) => `${match[1]}+${match[2]}`)
  const uniqueOffers = [...new Set(offers)]
  if (uniqueOffers.length) return { discountType: 'text', discountValue: 0, discountLabel: uniqueOffers.join(' / ') }

  const percent = text.match(/\b(\d{1,3})\s*%/)
  if (percent) return { discountType: 'percent', discountValue: Math.min(100, Number(percent[1])), discountLabel: '' }

  const amount = text.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:₽|руб)/i)
  if (amount) return { discountType: 'amount', discountValue: Number(amount[1].replace(',', '.')), discountLabel: '' }
  return {}
}

function isProductLine(line: string, merchant?: string): boolean {
  if (merchant && line.toLocaleLowerCase('ru-RU').includes(merchant.toLocaleLowerCase('ru-RU'))) return false
  if (containsDate(line) || isCodeOnlyLine(line)) return false
  if (/^(?:магазин|купон|касса|чек|итого|скидка)(?:\s|$)/i.test(line)) return false
  const letters = line.match(/[а-яёa-z]/gi)?.length || 0
  const cyrillic = line.match(/[а-яё]/gi)?.length || 0
  return line.length >= 5 && letters / line.length >= 0.45 && cyrillic >= 3
}

function isCodeOnlyLine(line: string): boolean {
  const compactValue = line.replace(/[\s-]/g, '')
  return /^\D?\d{8,}$/.test(compactValue) || !/[а-яёa-z]/i.test(line)
}

function containsDate(line: string): boolean {
  return /\b\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?\b/.test(line)
    || /(?:^|\s)\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s|$)/i.test(line)
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function cleanLine(value: string): string {
  return value
    .replace(/[|¦]+/g, ' ')
    .replace(/[^а-яёa-z0-9\s%+хx×=№₽.,:;!?()«»"'—–/*-]+/gi, ' ')
    .replace(/саный/gi, 'самый')
    .replace(/\s+/g, ' ')
    .trim()
}

function isMeaningfulTextLine(line: string): boolean {
  if (!line) return false
  const letters = line.match(/[а-яёa-z]/gi)?.length || 0
  const cyrillic = line.match(/[а-яё]/gi)?.length || 0
  const visibleLength = line.replace(/\s/g, '').length
  return cyrillic >= 3 && letters >= 3 && letters / Math.max(1, visibleLength) >= 0.38
}

function sentenceCase(value: string): string {
  const normalized = value.toLocaleLowerCase('ru-RU')
  return normalized.charAt(0).toLocaleUpperCase('ru-RU') + normalized.slice(1)
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T
}
