<template>
  <section class="course-guide">
    <header>
      <div>
        <small>Подключение за пару минут</small>
        <h2>Как получить токен</h2>
      </div>
      <a
        v-if="settingsUrl"
        class="course-guide__link"
        :href="settingsUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        Открыть настройки Courses
        <UiIcon name="right" />
      </a>
    </header>

    <ol>
      <li>
        <span>1</span>
        <div>
          <strong>Откройте Courses</strong>
          <p>Войдите в тот аккаунт, в котором находятся нужные опубликованные курсы.</p>
        </div>
      </li>
      <li>
        <span>2</span>
        <div>
          <strong>Перейдите в «Настройки»</strong>
          <p>В левом меню откройте «Настройки», затем найдите блок «Персональные токены».</p>
        </div>
      </li>
      <li>
        <span>3</span>
        <div>
          <strong>Создайте токен</strong>
          <p>Укажите понятное название, например «Мой календарь», и нажмите «Создать токен».</p>
        </div>
      </li>
      <li>
        <span>4</span>
        <div>
          <strong>Скопируйте и вставьте ниже</strong>
          <p>Токен показывается только один раз. Скопируйте его целиком, вставьте в поле и нажмите «Подключить».</p>
        </div>
      </li>
    </ol>

    <div class="course-guide__note">
      <UiIcon name="key" />
      <p><strong>Безопасно:</strong> токен хранится в зашифрованном виде. Его можно отозвать в Courses в любой момент.</p>
    </div>
  </section>
</template>

<script setup>
import UiIcon from '../../../../components/ui/UiIcon.vue'

defineProps({
  settingsUrl: { type: String, default: '' },
})
</script>

<style scoped>
.course-guide{display:grid;gap:18px;border:1px solid var(--border-color);border-radius:18px;padding:18px;background:var(--panel-bg);box-shadow:var(--shadow-sm)}.course-guide>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.course-guide small{color:#34d399;font-size:9px;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.course-guide h2{margin:4px 0 0}.course-guide__link{display:flex;align-items:center;gap:6px;border:1px solid color-mix(in srgb,#34d399 28%,var(--border-color));border-radius:999px;padding:8px 12px;color:#34d399;background:color-mix(in srgb,#34d399 8%,var(--control-bg));font-size:11px;font-weight:750;text-decoration:none}.course-guide ol{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0;padding:0;list-style:none}.course-guide li{display:grid;align-content:start;gap:11px;border:1px solid var(--border-color);border-radius:15px;padding:13px;background:var(--card-bg)}.course-guide li>span{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;color:#07130e;background:linear-gradient(145deg,#5ff5b3,#20c778);font-size:12px;font-weight:900}.course-guide strong{display:block}.course-guide li p{margin:5px 0 0;color:var(--text-muted);font-size:10px;line-height:1.5}.course-guide__note{display:flex;align-items:center;gap:9px;border-radius:12px;padding:10px 12px;color:var(--text-secondary);background:color-mix(in srgb,#34d399 7%,var(--control-bg))}.course-guide__note svg{flex:0 0 auto;color:#34d399;font-size:18px}.course-guide__note p{margin:0;font-size:10px;line-height:1.5}@media(max-width:850px){.course-guide ol{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.course-guide>header{display:grid}.course-guide ol{grid-template-columns:1fr}.course-guide__link{width:max-content}}
</style>
