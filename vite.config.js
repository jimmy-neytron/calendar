import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function pwaServiceWorker() {
  return {
    name: 'workspace-pwa-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const entryAssets = new Set()
      Object.values(bundle).forEach((output) => {
        if (output.type !== 'chunk' || !output.isEntry) return
        entryAssets.add(`/${output.fileName}`)
        output.viteMetadata?.importedCss?.forEach((file) => entryAssets.add(`/${file}`))
      })
      const publicAssets = [
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/favicon.svg',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-maskable-512.png',
        '/icons/apple-touch-icon.png',
      ]
      const precacheManifest = JSON.stringify([...new Set([...publicAssets, ...entryAssets])])
      const version = `workspace-calendar-${Date.now()}`
      const source = readFileSync(resolve('pwa-sw.js'), 'utf8')
        .replace('__CACHE_VERSION__', version)
        .replace('__PRECACHE_MANIFEST__', precacheManifest)

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source,
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), pwaServiceWorker()],
})
