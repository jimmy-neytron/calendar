<template>
  <section class="app-splash" aria-label="Загрузка приложения">
    <div class="app-splash__stage" aria-hidden="true">
      <div class="app-splash__orbit app-splash__orbit--one" />
      <div class="app-splash__orbit app-splash__orbit--two" />

      <div class="app-splash__calendar">
        <header class="app-splash__calendar-header">
          <span />
          <div>
            <i />
            <i />
          </div>
        </header>

        <div class="app-splash__weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>

        <div class="app-splash__month">
          <span
            v-for="cell in monthCells"
            :key="cell.day"
            class="app-splash__cell"
            :class="{
              'app-splash__cell--today': cell.day === 5,
              'app-splash__cell--muted': cell.muted,
              'app-splash__cell--event': cell.event,
            }"
            :style="{ '--cell-index': cell.index }"
          >
            <b>{{ cell.day }}</b>
            <i v-if="cell.event" />
          </span>

          <span class="app-splash__cell app-splash__cell--flying-day">
            <b>5</b>
          </span>
        </div>
      </div>
    </div>

    <div class="app-splash__copy">
      <span>Рабочее пространство</span>
      <strong>Собираем календарь</strong>
    </div>
  </section>
</template>

<script setup>
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const monthCells = Array.from({ length: 34 }, (_, index) => {
  const day = index < 2 ? 29 + index : index - 1

  return {
    day,
    index,
    muted: index < 2 || index > 31,
    event: [6, 12, 17, 24, 29].includes(index),
  }
})
</script>

<style>
.app-splash {
  --splash-bg: #05070a;
  --splash-panel: rgba(14, 18, 25, 0.92);
  --splash-card: rgba(255, 255, 255, 0.075);
  --splash-line: rgba(255, 255, 255, 0.13);
  --splash-text: #f7fafc;
  --splash-muted: rgba(247, 250, 252, 0.58);
  --splash-blue: #60a5fa;
  --splash-green: #34d399;
  --splash-pink: #f472b6;
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  color: var(--splash-text);
  background:
    radial-gradient(circle at 50% 36%, rgba(96, 165, 250, 0.22), transparent 31%),
    radial-gradient(circle at 62% 62%, rgba(52, 211, 153, 0.16), transparent 26%),
    linear-gradient(145deg, #020617 0%, var(--splash-bg) 48%, #101820 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  isolation: isolate;
}

.app-splash__stage {
  position: relative;
  width: min(100%, 430px);
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
}

.app-splash__orbit {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.72);
  animation: splashOrbit 2.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.app-splash__orbit--one {
  inset: 14%;
}

.app-splash__orbit--two {
  inset: 4%;
  border-color: rgba(96, 165, 250, 0.24);
  animation-delay: 0.12s;
}

.app-splash__calendar {
  position: relative;
  z-index: 2;
  width: min(100%, 390px);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 42%),
    var(--splash-panel);
  box-shadow:
    0 28px 90px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(24px) saturate(135%);
  opacity: 0;
  transform: translateY(18px) scale(0.88);
  animation: splashCalendarIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.38s forwards;
}

.app-splash__calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 15px;
}

.app-splash__calendar-header > span {
  width: 138px;
  height: 15px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--splash-text), rgba(247, 250, 252, 0.48));
  opacity: 0;
  transform: translateX(-12px);
  animation: splashHeaderLine 0.42s cubic-bezier(0.22, 1, 0.36, 1) 1.06s forwards;
}

.app-splash__calendar-header div {
  display: flex;
  gap: 8px;
}

.app-splash__calendar-header i {
  width: 30px;
  height: 30px;
  border: 1px solid var(--splash-line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  opacity: 0;
  transform: translateY(-6px);
  animation: splashHeaderButton 0.34s cubic-bezier(0.22, 1, 0.36, 1) 1.18s forwards;
}

.app-splash__calendar-header i:last-child {
  animation-delay: 1.25s;
}

.app-splash__weekdays,
.app-splash__month {
  --month-gap: 7px;
  --cell-width: calc((100% - (var(--month-gap) * 6)) / 7);
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--month-gap);
}

.app-splash__weekdays {
  margin-bottom: 8px;
}

.app-splash__weekdays span {
  height: 18px;
  color: var(--splash-muted);
  font-size: 10px;
  font-weight: 850;
  text-align: center;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(8px);
  animation: splashWeekdayIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.app-splash__weekdays span:nth-child(1) { animation-delay: 1.14s; }
.app-splash__weekdays span:nth-child(2) { animation-delay: 1.18s; }
.app-splash__weekdays span:nth-child(3) { animation-delay: 1.22s; }
.app-splash__weekdays span:nth-child(4) { animation-delay: 1.26s; }
.app-splash__weekdays span:nth-child(5) { animation-delay: 1.3s; }
.app-splash__weekdays span:nth-child(6) { animation-delay: 1.34s; }
.app-splash__weekdays span:nth-child(7) { animation-delay: 1.38s; }

.app-splash__month {
  position: relative;
}

.app-splash__cell {
  position: relative;
  display: grid;
  align-content: space-between;
  min-width: 0;
  aspect-ratio: 1 / 0.82;
  border: 1px solid var(--splash-line);
  border-radius: 7px;
  padding: 6px;
  background: var(--splash-card);
  opacity: 0;
  transform: translateY(12px) scale(0.88);
  animation: splashCellIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(1.28s + (var(--cell-index) * 0.025s));
}

.app-splash__cell b {
  color: rgba(247, 250, 252, 0.76);
  font-size: 11px;
  line-height: 1;
}

.app-splash__cell i {
  width: 74%;
  height: 5px;
  border-radius: 999px;
  background: var(--splash-blue);
  transform: scaleX(0);
  transform-origin: left;
  animation: splashEventIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(1.72s + (var(--cell-index) * 0.02s));
}

.app-splash__cell--muted {
  background: rgba(255, 255, 255, 0.035);
}

.app-splash__cell--today b {
  opacity: 0;
}

.app-splash__cell--today {
  opacity: 0;
  animation: none;
  pointer-events: none;
}

.app-splash__cell--event:nth-child(3n) i {
  background: var(--splash-green);
}

.app-splash__cell--event:nth-child(4n) i {
  background: var(--splash-pink);
}

.app-splash__cell--flying-day {
  position: absolute;
  top: 0;
  left: calc((var(--cell-width) + var(--month-gap)) * 6);
  z-index: 4;
  width: var(--cell-width);
  height: auto;
  aspect-ratio: 1 / 0.82;
  opacity: 0;
  pointer-events: none;
  transform-origin: center;
  animation: splashFlyingDay 2.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.app-splash__cell--flying-day b {
  opacity: 1;
}

.app-splash__copy {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: clamp(28px, 8vh, 72px);
  display: grid;
  justify-items: center;
  gap: 5px;
  text-align: center;
  opacity: 0;
  transform: translateY(10px);
  animation: splashCopyIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1.76s forwards;
}

.app-splash__copy span {
  color: var(--splash-muted);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}

.app-splash__copy strong {
  font-size: clamp(20px, 5vw, 30px);
  line-height: 1.05;
}

@keyframes splashFlyingDay {
  0% {
    opacity: 0;
    transform: translate(-146px, 122px) scale(3.25);
  }

  16% {
    opacity: 1;
    transform: translate(-146px, 122px) scale(3.25);
  }

  52% {
    opacity: 1;
    transform: translate(-146px, 122px) scale(3.25);
  }

  82%,
  100% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}

@keyframes splashCalendarIn {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes splashOrbit {
  0% {
    opacity: 0;
    transform: scale(0.72);
  }

  38% {
    opacity: 0.7;
  }

  100% {
    opacity: 0.18;
    transform: scale(1);
  }
}

@keyframes splashHeaderLine {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes splashHeaderButton {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splashWeekdayIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splashCellIn {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes splashEventIn {
  to {
    transform: scaleX(1);
  }
}

@keyframes splashCopyIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .app-splash {
    padding: 16px;
  }

  .app-splash__stage {
    width: min(100%, 350px);
  }

  .app-splash__calendar {
    padding: 12px;
  }

  .app-splash__weekdays,
  .app-splash__month {
    --month-gap: 5px;
  }

  .app-splash__cell {
    padding: 5px;
  }

  .app-splash__cell--flying-day {
    animation-name: splashFlyingDayMobile;
  }
}

@keyframes splashFlyingDayMobile {
  0% {
    opacity: 0;
    transform: translate(-118px, 104px) scale(3);
  }

  16% {
    opacity: 1;
    transform: translate(-118px, 104px) scale(3);
  }

  52% {
    opacity: 1;
    transform: translate(-118px, 104px) scale(3);
  }

  82%,
  100% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-splash__orbit,
  .app-splash__calendar,
  .app-splash__calendar-header > span,
  .app-splash__calendar-header i,
  .app-splash__weekdays span,
  .app-splash__cell,
  .app-splash__cell i,
  .app-splash__copy {
    animation: none;
  }

  .app-splash__calendar,
  .app-splash__calendar-header > span,
  .app-splash__calendar-header i,
  .app-splash__weekdays span,
  .app-splash__cell,
  .app-splash__copy {
    opacity: 1;
    transform: none;
  }

  .app-splash__cell i {
    transform: scaleX(1);
  }
}
</style>
