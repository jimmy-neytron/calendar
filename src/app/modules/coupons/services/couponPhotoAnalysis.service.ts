import { decodeCouponCodeImage, type DecodedCouponCode } from './couponCodeImage.service'
import { recognizeCouponPhotoText, type CouponPhotoOcrProgress } from './couponPhotoOcr.service'
import { parseCouponPhotoText, type ParsedCouponPhoto } from '../utils/couponPhotoParser'
import { filterCouponPhotoFieldsByConfidence } from '../utils/couponPhotoReliability'

export interface CouponPhotoAnalysis {
  codes: DecodedCouponCode[]
  fields: ParsedCouponPhoto
  ocrText: string
  ocrConfidence: number
  warning?: string
}

export async function analyzeCouponPhoto(
  file: File,
  onProgress?: (progress: CouponPhotoOcrProgress) => void,
): Promise<CouponPhotoAnalysis> {
  const [codesResult, ocrResult] = await Promise.allSettled([
    decodeCouponCodeImage(file),
    recognizeCouponPhotoText(file, onProgress),
  ])

  if (codesResult.status === 'rejected' && ocrResult.status === 'rejected') {
    throw new Error('Не удалось распознать фотографию. Попробуй снять купон ближе и без бликов.')
  }

  const ocr = ocrResult.status === 'fulfilled' ? ocrResult.value : null
  const reliableText = ocr
    ? filterCouponPhotoFieldsByConfidence(parseCouponPhotoText(ocr.text), ocr.confidence)
    : { fields: {}, warning: undefined }
  const warnings = [
    reliableText.warning,
    ocrResult.status === 'rejected'
      ? 'Штрихкоды распознаны, но текст заполнить не удалось. Попробуй снять купон ближе и без бликов.'
      : undefined,
    codesResult.status === 'rejected'
      ? 'Текст распознан, но штрихкоды нужно проверить или ввести вручную.'
      : undefined,
  ].filter(Boolean)
  return {
    codes: codesResult.status === 'fulfilled' ? codesResult.value.codes : [],
    fields: reliableText.fields,
    ocrText: ocr?.text || '',
    ocrConfidence: ocr?.confidence || 0,
    warning: warnings.length ? warnings.join(' ') : undefined,
  }
}
