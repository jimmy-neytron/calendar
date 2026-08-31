import type { ParsedCouponPhoto } from './couponPhotoParser'

export interface ReliableCouponPhotoFields {
  fields: ParsedCouponPhoto
  warning?: string
}

const MIN_TERMS_CONFIDENCE = 58

export function filterCouponPhotoFieldsByConfidence(
  fields: ParsedCouponPhoto,
  confidence: number,
): ReliableCouponPhotoFields {
  if (confidence >= MIN_TERMS_CONFIDENCE) return { fields }

  const { terms: _discardedTerms, ...reliableFields } = fields
  return {
    fields: reliableFields,
    warning: 'Текст распознан неуверенно: условия не заполнены автоматически. Проверь название и внеси условия вручную.',
  }
}
