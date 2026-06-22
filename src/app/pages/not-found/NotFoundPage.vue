<template>
  <section class="not-found">
    <div class="not-found__ambient" aria-hidden="true">
      <i /><i /><i />
    </div>

    <div class="not-found__content">
      <span class="not-found__eyebrow">Ошибка навигации</span>

      <div class="not-found__number" aria-label="404">
        <span>4</span>
        <div class="lost-orbit">
          <div class="lost-orbit__ring lost-orbit__ring--outer" />
          <div class="lost-orbit__ring lost-orbit__ring--inner" />
          <div class="lost-event">
            <header><i /><i /><span /></header>
            <div><strong>Страница не найдена</strong><i /></div>
          </div>
          <span class="lost-orbit__dot" />
        </div>
        <span>4</span>
      </div>

      <h1>Этой страницы нет в календаре</h1>
      <p>Возможно, ссылка устарела, адрес введён с ошибкой или страница переместилась в другой раздел.</p>

      <div class="not-found__actions">
        <UiButton icon="calendar" @click="goCalendar">Вернуться в календарь</UiButton>
      </div>

      <nav class="not-found__links">
        <RouterLink :to="{ name: 'movies' }"><UiIcon name="movie" /> Фильмы</RouterLink>
        <RouterLink :to="{ name: 'ideas' }"><UiIcon name="sparkles" /> Идеи</RouterLink>
        <RouterLink :to="{ name: 'sport' }"><UiIcon name="sport" /> Спорт</RouterLink>
        <RouterLink :to="{ name: 'analytics' }"><UiIcon name="chart" /> Аналитика</RouterLink>
      </nav>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'
import UiButton from '../../components/ui/UiButton.vue'
import UiIcon from '../../components/ui/UiIcon.vue'

const router = useRouter()
const goCalendar = () => router.push({ name: 'calendar' })
const goBack = () => window.history.length > 1 ? router.back() : goCalendar()
</script>

<style scoped>
.not-found{position:relative;display:grid;place-items:center;min-height:calc(100vh - var(--header-height) - 28px);overflow:hidden;border:1px solid var(--border-color);border-radius:var(--radius-xl);background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--info) 9%,transparent),transparent 38%),linear-gradient(145deg,var(--bg-card),var(--bg-primary));isolation:isolate}.not-found::before{position:absolute;inset:0;z-index:-2;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle at center,#000,transparent 72%);content:"";animation:gridMove 16s linear infinite}.not-found__ambient{position:absolute;inset:0;z-index:-1;overflow:hidden}.not-found__ambient i{position:absolute;border-radius:50%;filter:blur(20px);background:var(--info);opacity:.09;animation:ambientMove 8s ease-in-out infinite}.not-found__ambient i:nth-child(1){top:-15%;left:10%;width:34vw;height:34vw}.not-found__ambient i:nth-child(2){right:-10%;bottom:-22%;width:30vw;height:30vw;animation-delay:-3s}.not-found__ambient i:nth-child(3){top:44%;left:46%;width:13vw;height:13vw;opacity:.05;animation-delay:-5s}.not-found__content{display:grid;justify-items:center;width:min(100%,900px);padding:50px 24px;text-align:center;animation:contentEnter .7s var(--ease-out) both}.not-found__eyebrow{color:var(--info);font-size:9px;font-weight:850;letter-spacing:.18em;text-transform:uppercase}.not-found__number{display:flex;align-items:center;justify-content:center;margin:12px 0 5px;font-size:clamp(110px,18vw,210px);font-weight:950;line-height:.85;letter-spacing:-.09em}.not-found__number>span{color:transparent;background:linear-gradient(180deg,var(--text-primary),var(--text-muted));background-clip:text;filter:drop-shadow(0 18px 24px rgba(0,0,0,.26));animation:numberLand .75s var(--ease-out) both}.not-found__number>span:last-child{animation-delay:.1s}.lost-orbit{position:relative;display:grid;place-items:center;width:clamp(120px,17vw,195px);height:clamp(120px,17vw,195px);margin:0 clamp(-10px,-1vw,-4px)}.lost-orbit__ring{position:absolute;border:1px solid color-mix(in srgb,var(--info) 24%,transparent);border-radius:50%}.lost-orbit__ring--outer{inset:3%;border-style:dashed;animation:orbitSpin 14s linear infinite}.lost-orbit__ring--inner{inset:19%;animation:orbitSpin 9s linear infinite reverse}.lost-event{position:relative;z-index:1;width:68%;overflow:hidden;border:1px solid var(--border-strong);border-radius:14px;background:linear-gradient(145deg,var(--bg-card-soft),var(--bg-primary));box-shadow:0 20px 55px rgba(0,0,0,.42),0 0 35px color-mix(in srgb,var(--info) 10%,transparent);animation:eventFloat 4s ease-in-out infinite}.lost-event header{display:flex;align-items:center;gap:4px;height:24px;border-bottom:1px solid var(--border-color);padding:0 8px}.lost-event header i{width:4px;height:4px;border-radius:50%;background:var(--text-muted)}.lost-event header i:first-child{background:var(--danger)}.lost-event header span{width:25px;height:3px;margin-left:auto;border-radius:4px;background:var(--control-bg-hover)}.lost-event>div{display:grid;gap:3px;padding:10px;text-align:left}.lost-event strong{font-size:clamp(7px,1vw,10px);letter-spacing:0}.lost-event>div>i{display:block;width:65%;height:3px;margin-top:5px;border-radius:4px;background:var(--control-bg-hover)}.lost-orbit__dot{position:absolute;top:6%;left:50%;width:8px;height:8px;border-radius:50%;background:var(--info);box-shadow:0 0 20px var(--info);transform-origin:0 clamp(55px,8vw,90px);animation:dotOrbit 6s linear infinite}.not-found h1{margin:18px 0 9px;font-size:clamp(28px,4vw,45px);letter-spacing:-.045em}.not-found p{max-width:570px;margin:0;color:var(--text-secondary);font-size:12px;line-height:1.6}.not-found__actions{display:flex;gap:8px;margin-top:25px}.not-found__actions :deep(.ui-button){min-height:40px}.not-found__links{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:30px}.not-found__links a{display:flex;align-items:center;gap:5px;border:1px solid var(--border-color);border-radius:var(--radius-pill);padding:7px 10px;color:var(--text-muted);background:var(--control-bg);font-size:9px;text-decoration:none;transition:.18s var(--ease-out)}.not-found__links a:hover{border-color:var(--border-strong);color:var(--text-primary);transform:translateY(-2px)}@keyframes contentEnter{from{opacity:0;transform:translateY(25px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}@keyframes numberLand{from{opacity:0;transform:translateY(-35px) scale(.82);filter:blur(10px)}70%{transform:translateY(4px) scale(1.03);filter:blur(0)}to{opacity:1;transform:none}}@keyframes eventFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(2deg)}}@keyframes orbitSpin{to{transform:rotate(360deg)}}@keyframes dotOrbit{to{transform:rotate(360deg)}}@keyframes gridMove{to{background-position:42px 42px}}@keyframes ambientMove{50%{transform:translate3d(35px,-24px,0) scale(1.12)}}@media(max-width:600px){.not-found{min-height:calc(100vh - var(--header-height) - 20px)}.not-found__content{padding:36px 18px}.not-found__number{font-size:100px}.lost-orbit{width:108px;height:108px}.lost-orbit__dot{transform-origin:0 50px}.not-found__actions{display:grid;width:100%;max-width:280px}.not-found__links{margin-top:22px}}@media(prefers-reduced-motion:reduce){.not-found::before,.not-found__ambient i,.not-found__content,.not-found__number>span,.lost-orbit__ring,.lost-event,.lost-orbit__dot{animation:none}}
</style>
