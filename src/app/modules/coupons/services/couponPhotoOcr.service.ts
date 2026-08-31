import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'

export interface CouponPhotoOcrProgress {
  progress: number
  message: string
}

export interface CouponPhotoOcrResult {
  text: string
  confidence: number
}

type ProgressListener = (progress: CouponPhotoOcrProgress) => void

let workerPromise: Promise<Worker> | null = null
let activeProgressListener: ProgressListener | null = null

export async function recognizeCouponPhotoText(file: File, onProgress?: ProgressListener): Promise<CouponPhotoOcrResult> {
  activeProgressListener = onProgress || null
  onProgress?.({ progress: 0.02, message: 'Подготавливаю локальное распознавание текста…' })
  const canvas = await prepareCouponPhoto(file)
  const worker = await getWorker()
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    preserve_interword_spaces: '1',
    user_defined_dpi: '220',
  })
  const originalResult = await worker.recognize(canvas, { rotateAuto: true })
  onProgress?.({ progress: 0.82, message: 'Уточняю мелкий текст и дату…' })
  const enhancedCanvas = createEnhancedCanvas(canvas)
  const enhancedResult = await worker.recognize(enhancedCanvas, { rotateAuto: true })
  activeProgressListener = null
  return {
    text: [originalResult.data.text, enhancedResult.data.text].filter(Boolean).join('\n').trim(),
    confidence: Math.max(originalResult.data.confidence, enhancedResult.data.confidence),
  }
}

function createEnhancedCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const crop = {
    x: Math.round(source.width * 0.18),
    y: 0,
    width: Math.round(source.width * 0.64),
    height: Math.round(source.height * 0.68),
  }
  canvas.width = crop.width
  canvas.height = crop.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return source
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const dark = new Uint8Array(canvas.width * canvas.height)
  for (let index = 0; index < image.data.length; index += 4) {
    const gray = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114
    dark[index / 4] = gray < 150 ? 1 : 0
  }
  for (let pixel = 0; pixel < dark.length; pixel += 1) {
    const x = pixel % canvas.width
    const y = Math.floor(pixel / canvas.width)
    let isDark = false
    for (let offsetY = -1; offsetY <= 1 && !isDark; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const sampleX = x + offsetX
        const sampleY = y + offsetY
        if (sampleX >= 0 && sampleX < canvas.width && sampleY >= 0 && sampleY < canvas.height
          && dark[sampleY * canvas.width + sampleX]) { isDark = true; break }
      }
    }
    const index = pixel * 4
    const value = isDark ? 0 : 255
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = value
  }
  context.putImageData(image, 0, 0)
  return canvas
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('rus', OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker.min.js',
      langPath: '/ocr',
      corePath: '/ocr/core',
      logger: ({ progress, status }) => activeProgressListener?.({
        progress: Math.max(0.03, Math.min(1, progress)),
        message: localizeStatus(status, progress),
      }),
    }).catch((error) => {
      workerPromise = null
      throw error
    })
  }
  return workerPromise
}

async function prepareCouponPhoto(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  try {
    const crop = detectReceiptCrop(bitmap)
    const scale = Math.min(3, Math.max(1, 1800 / crop.width))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(crop.width * scale)
    canvas.height = Math.round(crop.height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Не удалось подготовить изображение для OCR')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    bitmap.close()
  }
}

interface ImageCrop { x: number; y: number; width: number; height: number }

function detectReceiptCrop(bitmap: ImageBitmap): ImageCrop {
  const sampleScale = Math.min(1, 480 / bitmap.width)
  const sample = document.createElement('canvas')
  sample.width = Math.max(1, Math.round(bitmap.width * sampleScale))
  sample.height = Math.max(1, Math.round(bitmap.height * sampleScale))
  const context = sample.getContext('2d', { willReadFrequently: true })
  if (!context) return fallbackCrop(bitmap)
  context.drawImage(bitmap, 0, 0, sample.width, sample.height)
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data
  const mask = new Uint8Array(sample.width * sample.height)
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4
    const red = pixels[offset]
    const green = pixels[offset + 1]
    const blue = pixels[offset + 2]
    const brightness = red * 0.299 + green * 0.587 + blue * 0.114
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue)
    mask[pixel] = brightness >= 150 && saturation <= 52 ? 1 : 0
  }

  const rowCounts = new Uint32Array(sample.height)
  const centralLeft = Math.round(sample.width * 0.1)
  const centralRight = Math.round(sample.width * 0.9)
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = centralLeft; x < centralRight; x += 1) rowCounts[y] += mask[y * sample.width + x]
  }
  const rowRun = findLongestDensityRun(rowCounts, Math.round(sample.width * 0.11), 18)
  if (!rowRun || rowRun.end - rowRun.start < sample.height * 0.18) return fallbackCrop(bitmap)

  const columnCounts = new Uint32Array(sample.width)
  for (let y = rowRun.start; y <= rowRun.end; y += 1) {
    for (let x = 0; x < sample.width; x += 1) columnCounts[x] += mask[y * sample.width + x]
  }
  const columnRun = findLongestDensityRun(columnCounts, Math.round((rowRun.end - rowRun.start + 1) * 0.28), 8)
  if (!columnRun || columnRun.end - columnRun.start < sample.width * 0.16) return fallbackCrop(bitmap)

  const detectedWidth = columnRun.end - columnRun.start + 1
  const detectedHeight = rowRun.end - rowRun.start + 1
  const aspect = detectedHeight / detectedWidth
  if (aspect < 0.7 || aspect > 5) return fallbackCrop(bitmap)
  const padding = Math.round(Math.max(detectedWidth, detectedHeight) * 0.025)
  const left = Math.max(0, columnRun.start - padding) / sampleScale
  const top = Math.max(0, rowRun.start - padding) / sampleScale
  const right = Math.min(sample.width - 1, columnRun.end + padding) / sampleScale
  const bottom = Math.min(sample.height - 1, rowRun.end + padding) / sampleScale
  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  }
}

function findLongestDensityRun(
  values: Uint32Array,
  minimum: number,
  maximumGap: number,
): { start: number; end: number } | null {
  let currentStart = -1
  let lastMatch = -1
  let best: { start: number; end: number } | null = null
  for (let index = 0; index <= values.length; index += 1) {
    if (index < values.length && values[index] >= minimum) {
      if (currentStart < 0) currentStart = index
      lastMatch = index
      continue
    }
    if (currentStart >= 0 && index - lastMatch <= maximumGap) continue
    if (currentStart >= 0 && (!best || lastMatch - currentStart > best.end - best.start)) {
      best = { start: currentStart, end: lastMatch }
    }
    currentStart = -1
    lastMatch = -1
  }
  return best
}

function fallbackCrop(bitmap: ImageBitmap): ImageCrop {
  return {
    x: Math.round(bitmap.width * 0.08),
    y: Math.round(bitmap.height * 0.16),
    width: Math.round(bitmap.width * 0.84),
    height: Math.round(bitmap.height * 0.72),
  }
}

function localizeStatus(status: string, progress: number): string {
  const percent = Math.round(progress * 100)
  if (status.includes('loading tesseract core')) return 'Загружаю OCR-модуль…'
  if (status.includes('loading language traineddata')) return `Загружаю русский словарь… ${percent}%`
  if (status.includes('initializing')) return 'Запускаю распознавание…'
  if (status.includes('recognizing text')) return `Распознаю текст купона… ${percent}%`
  return 'Анализирую фотографию…'
}
