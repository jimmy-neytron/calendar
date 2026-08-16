// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { segmentWardrobeImage } from './wardrobeImageSegmentation.service'
import { removeWardrobeImageBackground } from './wardrobeBackgroundRemoval.service'

vi.mock('./wardrobeImageSegmentation.service', () => ({
  segmentWardrobeImage: vi.fn(),
}))

const mockedSegmentWardrobeImage = vi.mocked(segmentWardrobeImage)

describe('removeWardrobeImageBackground', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
    255, 255, 255, 255,
  ])
  const context = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(pixels), width: 2, height: 2 } as ImageData)),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback, type?: string) => callback(new Blob(['canvas'], { type }))),
  } as unknown as HTMLCanvasElement

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 2, height: 2, close: vi.fn() })))
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return canvas
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })
  })

  it('uses ML segmentation for an opaque image', async () => {
    mockedSegmentWardrobeImage.mockResolvedValue(new Blob(['cutout'], { type: 'image/webp' }))

    const result = await removeWardrobeImageBackground(new Blob(['photo']), 'shirt.jpg')

    expect(mockedSegmentWardrobeImage).toHaveBeenCalledOnce()
    expect(result.name).toBe('shirt.webp')
    expect(result.type).toBe('image/webp')
  })

  it('falls back to border removal when segmentation is unavailable', async () => {
    mockedSegmentWardrobeImage.mockRejectedValue(new Error('Model is unavailable'))

    const result = await removeWardrobeImageBackground(new Blob(['photo']), 'shirt.jpg')

    expect(context.putImageData).toHaveBeenCalledOnce()
    expect(result.type).toBe('image/webp')
  })
})
