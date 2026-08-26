<template>
  <Teleport to="body">
    <Transition name="scanner-fade">
      <section v-if="modelValue" class="qr-scanner" role="dialog" aria-modal="true" aria-label="Сканер QR-кода">
        <header><div><small>Сканирование купона</small><strong>Наведите камеру на QR-код</strong></div><button type="button" aria-label="Закрыть сканер" @click="close"><UiIcon name="close" /></button></header>
        <main>
          <video ref="video" autoplay muted playsinline />
          <div class="qr-scanner__shade" aria-hidden="true"><div class="qr-scanner__frame"><i /><i /><i /><i /><span v-if="!error" /></div></div>
          <div v-if="isStarting" class="qr-scanner__message"><UiIcon name="camera" /><strong>Включаю камеру…</strong></div>
          <div v-else-if="error" class="qr-scanner__message qr-scanner__message--error"><UiIcon name="warning" /><strong>{{ error }}</strong><button type="button" @click="startCamera">Попробовать снова</button></div>
          <p v-else class="qr-scanner__hint">Держите код внутри рамки — он считается автоматически</p>
          <canvas ref="canvas" hidden />
        </main>
        <footer>
          <button v-if="canSwitchCamera" type="button" @click="switchCamera"><UiIcon name="refresh" /><span>Сменить камеру</span></button>
          <button v-if="torchSupported" type="button" :class="{ active: torchEnabled }" @click="toggleTorch"><UiIcon name="sparkles" /><span>{{ torchEnabled ? 'Выключить фонарь' : 'Включить фонарь' }}</span></button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import jsQR from 'jsqr'
import { onBeforeUnmount, ref, watch } from 'vue'
import UiIcon from '../../../components/ui/UiIcon.vue'

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorInstance { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
interface BarcodeDetectorClass { new(options?: { formats?: string[] }): BarcodeDetectorInstance }
interface TorchCapabilities extends MediaTrackCapabilities { torch?: boolean }

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; scan: [value: string] }>()
const video = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const isStarting = ref(false)
const error = ref('')
const canSwitchCamera = ref(false)
const torchSupported = ref(false)
const torchEnabled = ref(false)
const facingMode = ref<'environment' | 'user'>('environment')
let stream: MediaStream | null = null
let animationFrame = 0
let lastScanAt = 0
let isReadingFrame = false
let detector: BarcodeDetectorInstance | null = null

watch(() => props.modelValue, (open) => { if (open) void startCamera(); else stopCamera() }, { immediate: true })
onBeforeUnmount(stopCamera)

async function startCamera() {
  stopCamera()
  error.value = ''
  isStarting.value = true
  if (!navigator.mediaDevices?.getUserMedia) { error.value = 'Камера недоступна. Откройте приложение через HTTPS или localhost.'; isStarting.value = false; return }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facingMode.value }, width: { ideal: 1280 }, height: { ideal: 720 } } })
    if (!props.modelValue) return stopCamera()
    if (!video.value) throw new Error('Не удалось открыть камеру')
    video.value.srcObject = stream
    await video.value.play()
    const track = stream.getVideoTracks()[0]
    const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined
    torchSupported.value = Boolean(capabilities?.torch)
    canSwitchCamera.value = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput').length > 1
    const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
    try { detector = Detector ? new Detector({ formats: ['qr_code'] }) : null } catch { detector = null }
    animationFrame = requestAnimationFrame(scanFrame)
  } catch (reason) {
    error.value = cameraErrorMessage(reason)
  } finally {
    isStarting.value = false
  }
}

function stopCamera() {
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  detector = null
  torchSupported.value = false
  torchEnabled.value = false
  if (video.value) video.value.srcObject = null
}

async function scanFrame(timestamp: number) {
  animationFrame = requestAnimationFrame(scanFrame)
  if (!props.modelValue || isReadingFrame || timestamp - lastScanAt < 220 || !video.value || video.value.readyState < 2) return
  lastScanAt = timestamp
  isReadingFrame = true
  try {
    const nativeResult = detector ? (await detector.detect(video.value))[0]?.rawValue : ''
    const value = nativeResult || readFrameWithJsQr()
    if (value && props.modelValue) completeScan(value)
  } catch {
    const value = readFrameWithJsQr()
    if (value && props.modelValue) completeScan(value)
  } finally {
    isReadingFrame = false
  }
}

function readFrameWithJsQr() {
  if (!video.value || !canvas.value || !video.value.videoWidth || !video.value.videoHeight) return ''
  const scale = Math.min(1, 720 / video.value.videoWidth)
  const width = Math.max(1, Math.round(video.value.videoWidth * scale))
  const height = Math.max(1, Math.round(video.value.videoHeight * scale))
  canvas.value.width = width; canvas.value.height = height
  const context = canvas.value.getContext('2d', { willReadFrequently: true })
  if (!context) return ''
  context.drawImage(video.value, 0, 0, width, height)
  const image = context.getImageData(0, 0, width, height)
  return jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data || ''
}

function completeScan(value: string) { navigator.vibrate?.(80); stopCamera(); emit('scan', value); emit('update:modelValue', false) }
function close() { emit('update:modelValue', false) }
async function switchCamera() { facingMode.value = facingMode.value === 'environment' ? 'user' : 'environment'; await startCamera() }
async function toggleTorch() {
  const track = stream?.getVideoTracks()[0]
  if (!track) return
  try { torchEnabled.value = !torchEnabled.value; await track.applyConstraints({ advanced: [{ torch: torchEnabled.value } as MediaTrackConstraintSet] }) } catch { torchEnabled.value = false }
}
function cameraErrorMessage(reason: unknown) {
  if (reason instanceof DOMException && reason.name === 'NotAllowedError') return 'Разрешите доступ к камере в настройках браузера.'
  if (reason instanceof DOMException && reason.name === 'NotFoundError') return 'Камера на устройстве не найдена.'
  if (reason instanceof DOMException && reason.name === 'NotReadableError') return 'Камера уже используется другим приложением.'
  return reason instanceof Error ? reason.message : 'Не удалось включить камеру.'
}
</script>

<style scoped>
.qr-scanner { position: fixed; inset: 0; z-index: 80; display: grid; grid-template-rows: auto 1fr auto; color: #fff; background: #050608; }.qr-scanner > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: max(16px, env(safe-area-inset-top)) 18px 14px; background: linear-gradient(180deg, rgba(0,0,0,.72), transparent); }.qr-scanner > header > div { display: grid; gap: 3px; }.qr-scanner > header small { color: rgba(255,255,255,.58); font-size: 9px; text-transform: uppercase; letter-spacing: .1em; }.qr-scanner > header strong { font-size: 16px; }.qr-scanner > header button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; color: #fff; background: rgba(255,255,255,.09); font-size: 18px; }.qr-scanner > main { position: relative; min-height: 0; overflow: hidden; }.qr-scanner video { width: 100%; height: 100%; display: block; object-fit: cover; }.qr-scanner__shade { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(circle at center, transparent 0 28%, rgba(0,0,0,.5) 53%); }.qr-scanner__frame { position: relative; width: min(68vw, 330px); aspect-ratio: 1; }.qr-scanner__frame i { position: absolute; width: 42px; height: 42px; border-color: #fff; border-style: solid; }.qr-scanner__frame i:nth-child(1) { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 14px 0 0; }.qr-scanner__frame i:nth-child(2) { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 14px 0 0; }.qr-scanner__frame i:nth-child(3) { right: 0; bottom: 0; border-width: 0 3px 3px 0; border-radius: 0 0 14px; }.qr-scanner__frame i:nth-child(4) { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 14px; }.qr-scanner__frame span { position: absolute; right: 5px; left: 5px; height: 2px; border-radius: 2px; background: #7c8cf8; box-shadow: 0 0 12px #7c8cf8; animation: qr-scan 2.2s ease-in-out infinite; }.qr-scanner__hint { position: absolute; right: 20px; bottom: 24px; left: 20px; margin: 0; color: rgba(255,255,255,.72); font-size: 10px; text-align: center; }.qr-scanner__message { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 10px; background: #07080b; }.qr-scanner__message :deep(svg) { font-size: 30px; }.qr-scanner__message strong { font-size: 11px; }.qr-scanner__message button { border: 1px solid rgba(255,255,255,.2); border-radius: 999px; padding: 9px 14px; color: #fff; background: rgba(255,255,255,.1); font-size: 10px; }.qr-scanner__message--error :deep(svg) { color: #f87171; }.qr-scanner > footer { min-height: 82px; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 18px max(12px, env(safe-area-inset-bottom)); }.qr-scanner > footer button { min-width: 120px; display: grid; justify-items: center; gap: 5px; border: 0; color: rgba(255,255,255,.72); background: transparent; font-size: 8px; }.qr-scanner > footer button :deep(svg) { width: 34px; height: 34px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; padding: 8px; color: #fff; background: rgba(255,255,255,.09); }.qr-scanner > footer button.active :deep(svg) { color: #111; background: #fff; }.scanner-fade-enter-active, .scanner-fade-leave-active { transition: opacity .18s ease; }.scanner-fade-enter-from, .scanner-fade-leave-to { opacity: 0; }
@keyframes qr-scan { 0%, 100% { top: 8px; opacity: .45; } 50% { top: calc(100% - 10px); opacity: 1; } }
</style>
