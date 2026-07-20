import './app/stores/networkActivity.store.js'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router/index.js'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from './app/query/queryClient.js'
import { initializePwa } from './app/composables/pwa/usePwa.js'
import './assets/styles/variables.css'
import './assets/styles/animations.css'
import './assets/styles/main.css'

const app = createApp(App)

app.use(router)
app.use(VueQueryPlugin, { queryClient })
await router.isReady()
app.mount('#app')

window.addEventListener('load', initializePwa)
