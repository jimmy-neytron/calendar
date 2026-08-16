import type { BackgroundRemovalPipeline, RawImage } from '@huggingface/transformers'

const BACKGROUND_REMOVAL_MODEL = 'onnx-community/ormbg-ONNX'

let segmenterPromise: Promise<BackgroundRemovalPipeline> | null = null
let segmentationQueue: Promise<void> = Promise.resolve()

export async function segmentWardrobeImage(source: Blob): Promise<Blob> {
  const task = segmentationQueue.then(async () => {
    const segmenter = await getSegmenter()
    const cutout = await segmenter(source)
    return rawImageToBlob(cutout)
  })
  segmentationQueue = task.then(() => undefined, () => undefined)
  return task
}

async function getSegmenter(): Promise<BackgroundRemovalPipeline> {
  if (!segmenterPromise) {
    segmenterPromise = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('background-removal', BACKGROUND_REMOVAL_MODEL, { dtype: 'q8' }))
      .catch((error: unknown) => {
        segmenterPromise = null
        throw error
      })
  }

  return segmenterPromise
}

function rawImageToBlob(image: RawImage): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas недоступен')

  const pixels = new Uint8ClampedArray(image.data)
  context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Не удалось обработать изображение')),
      'image/webp',
      0.92,
    )
  })
}
