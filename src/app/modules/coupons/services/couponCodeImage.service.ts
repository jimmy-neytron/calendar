import type { CouponBarcodeFormat, CouponCodeType } from '../../../types/coupon'

interface DetectedCode {
  rawValue: string
  format: string
}

interface NativeBarcodeDetectorInstance {
  detect(source: ImageBitmap): Promise<DetectedCode[]>
}

interface NativeBarcodeDetectorClass {
  new(options?: { formats?: string[] }): NativeBarcodeDetectorInstance
}

export interface DecodedCouponCode {
  value: string
  codeType: Exclude<CouponCodeType, 'promo' | 'none'>
  barcodeFormat: CouponBarcodeFormat
}

const nativeFormats = ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
const qrFormats = new Set(['qr_code', 'qr_code_model_1', 'qr_code_model_2', 'micro_qr_code', 'rm_qr_code'])

export function mapDetectedCouponCode(result: DetectedCode): DecodedCouponCode {
  return {
    value: result.rawValue,
    codeType: qrFormats.has(result.format) ? 'qr' : 'barcode',
    barcodeFormat: mapBarcodeFormat(result.format),
  }
}

export async function decodeCouponCodeImage(file: File): Promise<DecodedCouponCode> {
  const nativeResult = await detectWithBrowser(file)
  if (nativeResult) return mapDetectedCouponCode(nativeResult)

  const { BarcodeDetector } = await import('barcode-detector/ponyfill')
  const detector = new BarcodeDetector({ formats: ['any'] })
  const [fallbackResult] = await detector.detect(file)

  if (!fallbackResult?.rawValue) throw new Error('Код на изображении не найден. Попробуй более чёткое фото.')
  return mapDetectedCouponCode(fallbackResult)
}

async function detectWithBrowser(file: File): Promise<DetectedCode | null> {
  const browserWindow = window as typeof window & { BarcodeDetector?: NativeBarcodeDetectorClass }
  if (!browserWindow.BarcodeDetector || typeof createImageBitmap !== 'function') return null

  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const detector = new browserWindow.BarcodeDetector({ formats: nativeFormats })
    const [result] = await detector.detect(bitmap)
    return result?.rawValue ? result : null
  } catch {
    return null
  } finally {
    bitmap?.close()
  }
}

function mapBarcodeFormat(format: string): CouponBarcodeFormat {
  const formats: Partial<Record<string, CouponBarcodeFormat>> = {
    code_128: 'code128',
    ean_13: 'ean13',
    ean_8: 'ean8',
    upc_a: 'upca',
  }
  return formats[format] ?? 'code128'
}
