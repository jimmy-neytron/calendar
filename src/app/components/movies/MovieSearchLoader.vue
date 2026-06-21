<template>
  <div class="movie-loader" role="status" aria-live="polite">
    <div class="movie-loader__reel">
      <span v-for="index in 8" :key="index" />
      <i />
    </div>
    <div>
      <strong>{{ title }}</strong>
      <p>Собираем лучшие совпадения в TMDB</p>
    </div>
    <div class="movie-loader__line"><span /></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), {
  title: 'Ищем кино…',
})
</script>

<style scoped>
.movie-loader{display:grid;place-items:center;gap:12px;min-height:290px;border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:28px;text-align:center;background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--accent) 9%,transparent),transparent 34%),var(--card-solid);overflow:hidden}.movie-loader__reel{position:relative;width:76px;height:76px;border:4px solid var(--border-strong);border-radius:50%;animation:movie-reel 2.3s linear infinite}.movie-loader__reel span{position:absolute;left:50%;top:50%;width:12px;height:17px;border-radius:8px;background:var(--control-bg-hover);transform-origin:6px 6px}.movie-loader__reel span:nth-child(1){transform:translate(-50%,-50%) rotate(0deg) translateY(-25px)}.movie-loader__reel span:nth-child(2){transform:translate(-50%,-50%) rotate(45deg) translateY(-25px)}.movie-loader__reel span:nth-child(3){transform:translate(-50%,-50%) rotate(90deg) translateY(-25px)}.movie-loader__reel span:nth-child(4){transform:translate(-50%,-50%) rotate(135deg) translateY(-25px)}.movie-loader__reel span:nth-child(5){transform:translate(-50%,-50%) rotate(180deg) translateY(-25px)}.movie-loader__reel span:nth-child(6){transform:translate(-50%,-50%) rotate(225deg) translateY(-25px)}.movie-loader__reel span:nth-child(7){transform:translate(-50%,-50%) rotate(270deg) translateY(-25px)}.movie-loader__reel span:nth-child(8){transform:translate(-50%,-50%) rotate(315deg) translateY(-25px)}.movie-loader__reel i{position:absolute;inset:27px;border-radius:50%;background:var(--accent)}.movie-loader strong{display:block;font-size:15px}.movie-loader p{margin:3px 0 0;color:var(--text-muted)}.movie-loader__line{width:min(260px,72%);height:3px;border-radius:var(--radius-pill);overflow:hidden;background:var(--control-bg)}.movie-loader__line span{display:block;width:42%;height:100%;border-radius:inherit;background:var(--accent);animation:movie-line 1.25s var(--ease-out) infinite}@keyframes movie-reel{to{transform:rotate(360deg)}}@keyframes movie-line{0%{transform:translateX(-110%)}100%{transform:translateX(350%)}}@media(prefers-reduced-motion:reduce){.movie-loader__reel,.movie-loader__line span{animation:none}}
</style>
