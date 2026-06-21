import './app/stores/networkActivity.store.js'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router/index.js'
import './assets/styles/variables.css'
import './assets/styles/animations.css'
import './assets/styles/main.css'

createApp(App).use(router).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
