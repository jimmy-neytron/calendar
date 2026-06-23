<template>
  <main class="app-container">
    <slot />
  </main>
</template>

<style scoped>
.app-container {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 14px;
}

@media (max-width: 860px) {
  .app-container {
    padding: 10px;
  }
}

@media (min-width: 600px) and (max-width: 1180px) {
  .app-container {
    padding: 9px;
  }
}
</style>
