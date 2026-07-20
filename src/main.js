import './app/stores/networkActivity.store.js'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router/index.js'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { initializePwa } from './app/composables/pwa/usePwa.js'
import './assets/styles/variables.css'
import './assets/styles/animations.css'
import './assets/styles/main.css'

const app = createApp(App)

app.use(router)
app.use(VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }) })
await router.isReady()
app.mount('#app')

window.addEventListener('load', initializePwa)
