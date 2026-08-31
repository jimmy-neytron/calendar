import type { CouponBarcodeFormat, CouponCodeType } from '../../../types/coupon'

interface DetectedCode {
  rawValue: string
  format: string
  boundingBox?: { y: number }
  cornerPoints?: Array<{ y: number }>
  imageY?: number
}

interface NativeBarcodeDetectorInstance {
  detect(source: ImageBitmap | HTMLCanvasElement): Promise<DetectedCode[]>
}

interface NativeBarcodeDetectorClass {
  new(options?: { formats?: string[] }): NativeBarcodeDetectorInstance
}

export interface DecodedCouponCode {
  value: string
  codeType: Exclude<CouponCodeType, 'promo' | 'none'>
  barcodeFormat: CouponBarcodeFormat
}

export interface DecodedCouponCodeImage {
  codes: DecodedCouponCode[]
}

const nativeFormats = ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
const qrFormats = new Set(['qr_code', 'qr_code_model_1', 'qr_code_model_2', 'micro_qr_code', 'rm_qr_code'])

export function mapDetectedCouponCode(result: DetectedCode): DecodedCouponCode {
  return {
    value: normalizeDetectedValue(result.rawValue, result.format),
    codeType: qrFormats.has(result.format) ? 'qr' : 'barcode',
    barcodeFormat: mapBarcodeFormat(result.format),
  }
}

function normalizeDetectedValue(value: string, format: string): string {
  const trimmed = value.trim()
  if (qrFormats.has(format)) return trimmed
  const withoutFalsePrefix = trimmed.match(/^\D(\d{11,})$/)?.[1]
  return withoutFalsePrefix || trimmed
}

export async function decodeCouponCodeImage(file: File): Promise<DecodedCouponCodeImage> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const nativeResults = await detectWithBrowser(bitmap)
    const nativeCodes = normalizeDetectedCodes(nativeResults)
    if (nativeCodes.length > 1 || nativeCodes[0]?.codeType === 'qr') return { codes: nativeCodes }

    const ponyfillResults = nativeResults.length ? [] : await detectWithPonyfill(bitmap)
    const fallbackCodes = normalizeDetectedCodes([...nativeResults, ...ponyfillResults])
    if (fallbackCodes.length > 1 || fallbackCodes[0]?.codeType === 'qr') return { codes: fallbackCodes }

    const enhancedResults = await detectEnhancedLinearCodes(bitmap)
    const codes = normalizeDetectedCodes([...nativeResults, ...ponyfillResults, ...enhancedResults])

    if (!codes.length) throw new Error('Код на изображении не найден. Попробуй более чёткое фото.')
    return { codes }
  } finally {
    bitmap?.close()
  }
}

async function detectWithPonyfill(bitmap: ImageBitmap): Promise<DetectedCode[]> {
  const { BarcodeDetector } = await import('barcode-detector/ponyfill')
  const detector = new BarcodeDetector({ formats: ['any'] })
  return detectAcrossImage(bitmap, detector)
}

async function detectEnhancedLinearCodes(bitmap: ImageBitmap): Promise<DetectedCode[]> {
  const { readBarcodes } = await import('zxing-wasm/reader')
  const results: DetectedCode[] = []
  for (const region of createDetailedScanRegions(bitmap.width, bitmap.height)) {
    for (const variant of ['contrast', 'threshold'] as const) {
      const canvas = renderRegion(bitmap, region, variant)
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) continue
      try {
        const detected = await readBarcodes(context.getImageData(0, 0, canvas.width, canvas.height), {
          formats: ['AllLinear'],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true,
          tryDownscale: false,
          minLineCount: 1,
          maxNumberOfSymbols: 8,
          returnErrors: true,
          binarizer: variant === 'threshold' ? 'GlobalHistogram' : 'LocalAverage',
        })
        results.push(...detected
          .filter((result) => result.text.trim().length >= 6)
          .map((result) => ({
            rawValue: result.text.trim(),
            format: normalizeZxingFormat(result.format),
            imageY: region.y + Math.min(result.position.topLeft.y, result.position.topRight.y) / region.scale,
          })))
      } catch {
        // Continue with the next crop and preprocessing strategy.
      }
    }
  }
  return results
}

export function normalizeDetectedCodes(results: DetectedCode[]): DecodedCouponCode[] {
  const sorted = [...results]
    .filter((result) => result.rawValue)
    .sort((left, right) => verticalPosition(left) - verticalPosition(right))
  const groups: DetectedCode[][] = []
  for (const result of sorted) {
    const group = groups.find((items) => items.some((item) => isSameDetectedCode(item, result)))
    if (group) group.push(result)
    else groups.push([result])
  }
  return groups.map(selectPreferredDetection).map(mapDetectedCouponCode)
}

async function detectWithBrowser(bitmap: ImageBitmap): Promise<DetectedCode[]> {
  const browserWindow = window as typeof window & { BarcodeDetector?: NativeBarcodeDetectorClass }
  if (!browserWindow.BarcodeDetector) return []

  try {
    const detector = new browserWindow.BarcodeDetector({ formats: nativeFormats })
    return await safeDetect(detector, bitmap)
  } catch {
    return []
  }
}

async function detectAcrossImage(bitmap: ImageBitmap, detector: NativeBarcodeDetectorInstance): Promise<DetectedCode[]> {
  const results: DetectedCode[] = await safeDetect(detector, bitmap)

  for (const region of createScanRegions(bitmap.width, bitmap.height)) {
    const canvas = renderRegion(bitmap, region)
    const detected = await safeDetect(detector, canvas)
    results.push(...detected.map((result) => ({
      ...result,
      imageY: region.y + verticalPosition(result) / region.scale,
    })))
  }
  return results
}

async function safeDetect(detector: NativeBarcodeDetectorInstance, source: ImageBitmap | HTMLCanvasElement): Promise<DetectedCode[]> {
  try {
    return await detector.detect(source)
  } catch {
    return []
  }
}

interface ScanRegion { x: number; y: number; width: number; height: number; scale: number }

function createScanRegions(imageWidth: number, imageHeight: number): ScanRegion[] {
  const regions: ScanRegion[] = []
  for (const xRatio of [0, 0.1]) {
    const widthRatio = xRatio === 0 ? 1 : 0.8
    for (const yRatio of [0, 0.2, 0.4, 0.6]) {
      const x = Math.round(imageWidth * xRatio)
      const y = Math.round(imageHeight * yRatio)
      const width = Math.round(imageWidth * widthRatio)
      const height = Math.min(Math.round(imageHeight * 0.4), imageHeight - y)
      regions.push({ x, y, width, height, scale: Math.min(2.5, Math.max(1, 1600 / width)) })
    }
  }
  return regions
}

function createDetailedScanRegions(imageWidth: number, imageHeight: number): ScanRegion[] {
  return [
    { x: 0.12, y: 0.48, width: 0.76, height: 0.32 },
  ].map((region) => {
    const width = Math.round(imageWidth * region.width)
    return {
      x: Math.round(imageWidth * region.x),
      y: Math.round(imageHeight * region.y),
      width,
      height: Math.round(imageHeight * region.height),
      scale: Math.min(4, Math.max(1.5, 2000 / width)),
    }
  })
}

function renderRegion(bitmap: ImageBitmap, region: ScanRegion, variant: 'original' | 'contrast' | 'threshold' = 'original'): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(region.width * region.scale)
  canvas.height = Math.round(region.height * region.scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не удалось подготовить изображение для распознавания')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height)
  if (variant !== 'original') enhanceCanvas(context, canvas.width, canvas.height, variant)
  return canvas
}

function enhanceCanvas(context: CanvasRenderingContext2D, width: number, height: number, variant: 'contrast' | 'threshold') {
  const image = context.getImageData(0, 0, width, height)
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 2.2 + 128))
    const value = variant === 'threshold' ? (contrasted < 155 ? 0 : 255) : contrasted
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = value
  }
  context.putImageData(image, 0, 0)
}

function verticalPosition(result: DetectedCode): number {
  if (typeof result.imageY === 'number') return result.imageY
  if (typeof result.boundingBox?.y === 'number') return result.boundingBox.y
  if (result.cornerPoints?.length) return Math.min(...result.cornerPoints.map((point) => point.y))
  return Number.MAX_SAFE_INTEGER
}

function areNearDuplicateValues(left: string, right: string): boolean {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false
  let leftIndex = 0
  let rightIndex = 0
  let differences = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    differences += 1
    if (differences > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else { leftIndex += 1; rightIndex += 1 }
  }
  if (leftIndex < left.length || rightIndex < right.length) differences += 1
  return differences <= 1
}

function isSameDetectedCode(left: DetectedCode, right: DetectedCode): boolean {
  if (!areNearDuplicateValues(left.rawValue, right.rawValue)) return false
  const leftY = verticalPosition(left)
  const rightY = verticalPosition(right)
  return !Number.isFinite(leftY) || !Number.isFinite(rightY) || Math.abs(leftY - rightY) <= 80
}

function selectPreferredDetection(results: DetectedCode[]): DetectedCode {
  const counts = new Map<string, number>()
  for (const result of results) counts.set(result.rawValue, (counts.get(result.rawValue) || 0) + 1)
  const preferredValue = [...counts.keys()].sort((left, right) =>
    (counts.get(right) || 0) - (counts.get(left) || 0)
    || Number(/^\d+$/.test(right)) - Number(/^\d+$/.test(left))
    || left.length - right.length)[0]
  return results.find((result) => result.rawValue === preferredValue) || results[0]
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

function normalizeZxingFormat(format: string): string {
  const formats: Record<string, string> = { Code128: 'code_128', EAN13: 'ean_13', EAN8: 'ean_8', UPCA: 'upc_a', QRCode: 'qr_code' }
  return formats[format] || format.toLocaleLowerCase('en-US')
}
