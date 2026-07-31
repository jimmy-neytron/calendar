const CACHE_NAME = 'wardrobe-cutouts-v1'
const MAX_SIDE = 1400

export async function removeWardrobeImageBackground(source: Blob, fileName = 'wardrobe-image'): Promise<File> {
  const bitmap = await createImageBitmap(source)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas недоступен')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const image = context.getImageData(0, 0, width, height)
  if (!hasUsefulTransparency(image.data)) makeBorderTransparent(image.data, width, height)
  context.clearRect(0, 0, width, height)
  context.putImageData(image, 0, 0)
  const blob = await canvasBlob(canvas)
  return new File([blob], `${baseName(fileName)}.webp`, { type: 'image/webp', lastModified: Date.now() })
}

export async function createWardrobeCutoutUrl(sourceUrl: string, imagePath: string): Promise<string> {
  if (!sourceUrl) return ''
  const cacheKey = new Request(`${location.origin}/__wardrobe_cutouts__/${encodeURIComponent(imagePath)}?v=1`)
  const cache = 'caches' in window ? await caches.open(CACHE_NAME) : null
  const cached = await cache?.match(cacheKey)
  if (cached) return URL.createObjectURL(await cached.blob())

  const response = await fetch(sourceUrl)
  if (!response.ok) return sourceUrl
  const source = await response.blob()
  try {
    const cutout = await removeWardrobeImageBackground(source, imagePath)
    await cache?.put(cacheKey, new Response(cutout, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'max-age=31536000' } }))
    return URL.createObjectURL(cutout)
  } catch {
    return sourceUrl
  }
}

function makeBorderTransparent(data: Uint8ClampedArray, width: number, height: number) {
  const background = estimateBackground(data, width, height)
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const enqueue = (index: number) => {
    if (visited[index] || !isBackground(data, index, background)) return
    visited[index] = 1
    queue[tail++] = index
  }
  for (let x = 0; x < width; x += 1) { enqueue(x);enqueue((height - 1) * width + x) }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width);enqueue(y * width + width - 1) }

  while (head < tail) {
    const index = queue[head++]
    const pixel = index * 4
    const distance = colorDistance(data[pixel], data[pixel+1], data[pixel+2], background)
    data[pixel+3] = Math.min(data[pixel+3], Math.round(clamp((distance - 24) / 38, 0, 1) * 255))
    const x = index % width
    if (x > 0) enqueue(index - 1)
    if (x < width - 1) enqueue(index + 1)
    if (index >= width) enqueue(index - width)
    if (index < width * (height - 1)) enqueue(index + width)
  }
}

function estimateBackground(data: Uint8ClampedArray, width: number, height: number) {
  const patch = Math.max(2, Math.round(Math.min(width, height) * .035))
  const buckets = new Map<string,{count:number;r:number;g:number;b:number}>()
  const areas = [[0,0],[width-patch,0],[0,height-patch],[width-patch,height-patch]]
  for (const [startX,startY] of areas) for(let y=startY;y<startY+patch;y+=1) for(let x=startX;x<startX+patch;x+=1){
    const pixel=(y*width+x)*4
    if(data[pixel+3]<220)continue
    const key=`${data[pixel]>>4}-${data[pixel+1]>>4}-${data[pixel+2]>>4}`
    const bucket=buckets.get(key)||{count:0,r:0,g:0,b:0}
    bucket.count+=1;bucket.r+=data[pixel];bucket.g+=data[pixel+1];bucket.b+=data[pixel+2];buckets.set(key,bucket)
  }
  const best=[...buckets.values()].sort((a,b)=>b.count-a.count)[0]||{count:1,r:255,g:255,b:255}
  return {r:best.r/best.count,g:best.g/best.count,b:best.b/best.count}
}

function isBackground(data: Uint8ClampedArray,index:number,background:{r:number;g:number;b:number}){
  const pixel=index*4
  if(data[pixel+3]<10)return true
  return colorDistance(data[pixel],data[pixel+1],data[pixel+2],background)<72
}
function colorDistance(r:number,g:number,b:number,background:{r:number;g:number;b:number}){return Math.sqrt((r-background.r)**2+(g-background.g)**2+(b-background.b)**2)}
function hasUsefulTransparency(data:Uint8ClampedArray){let transparent=0;for(let index=3;index<data.length;index+=4)if(data[index]<245)transparent+=1;return transparent>data.length/4*.005}
function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Не удалось обработать изображение')),'image/webp',.92))}
function baseName(value:string){return(value.split('/').pop()||'wardrobe-image').replace(/\.[^.]+$/,'')}
function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}
