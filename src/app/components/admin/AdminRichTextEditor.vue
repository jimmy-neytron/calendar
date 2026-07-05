<template>
  <section class="rich-editor">
    <div v-if="editor" class="rich-editor__toolbar" aria-label="Форматирование текста">
      <div class="rich-editor__group">
        <button type="button" title="Жирный" :class="{ active: toolbarState.bold }" @click="toggleBold">
          <b>B</b>
        </button>
        <button type="button" title="Курсив" :class="{ active: toolbarState.italic }" @click="toggleItalic">
          <b><i>I</i></b>
        </button>
        <button type="button" title="Список" :class="{ active: toolbarState.bulletList }" @click="toggleList">
          <UiIcon name="list" />
        </button>
        <button type="button" title="Ссылка" :class="{ active: toolbarState.link }" @click="setLink">
          <UiIcon name="link" />
        </button>
      </div>

      <UiSelect
        v-model="toolbarState.headingLevel"
        class="rich-editor__heading-select"
        compact
        aria-label="Стиль текста"
        @change="setHeadingLevel"
      >
        <option value="paragraph">Обычный текст</option>
        <option v-for="level in headingLevels" :key="level" :value="String(level)">Заголовок {{ level }}</option>
      </UiSelect>

      <button type="button" title="Очистить" @click="clearFormatting">
        <UiIcon name="close" />
      </button>
    </div>

    <EditorContent :editor="editor" class="rich-editor__content" />
  </section>
</template>

<script setup>
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { reactive, watch } from 'vue'
import UiIcon from '../ui/UiIcon.vue'
import UiSelect from '../ui/UiSelect.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Напиши содержимое модального окна...' },
})
const emit = defineEmits(['update:modelValue'])
const headingLevels = [1, 2, 3, 4, 5, 6]
const toolbarState = reactive({
  bold: false,
  italic: false,
  bulletList: false,
  link: false,
  headingLevel: 'paragraph',
})
const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: headingLevels },
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        target: '_blank',
        rel: 'noreferrer',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'rich-editor__area',
      'data-placeholder': props.placeholder,
    },
  },
  onUpdate: ({ editor: updatedEditor }) => {
    emit('update:modelValue', updatedEditor.getHTML())
    refreshToolbarState(updatedEditor)
  },
  onCreate: ({ editor: createdEditor }) => {
    refreshToolbarState(createdEditor)
  },
  onSelectionUpdate: ({ editor: updatedEditor }) => {
    refreshToolbarState(updatedEditor)
  },
  onTransaction: ({ editor: updatedEditor }) => {
    refreshToolbarState(updatedEditor)
  },
})

watch(() => props.modelValue, (value) => {
  if (!editor.value) return
  if (editor.value.getHTML() === value) return
  editor.value.commands.setContent(value || '', { emitUpdate: false })
  refreshToolbarState()
})

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
  refreshToolbarState()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
  refreshToolbarState()
}

function setHeadingLevel(value) {
  const currentEditor = editor.value
  if (!currentEditor) return

  if (value === 'paragraph') {
    currentEditor.chain().focus().setParagraph().run()
    refreshToolbarState(currentEditor)
    return
  }

  const level = Number(value)
  if (!headingLevels.includes(level)) return
  currentEditor.chain().focus().setHeading({ level }).run()
  refreshToolbarState(currentEditor)
}

function toggleList() {
  editor.value?.chain().focus().toggleBulletList().run()
  refreshToolbarState()
}

function setLink() {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href || ''
  const nextUrl = window.prompt('Ссылка', previousUrl)
  if (nextUrl === null) return
  if (!nextUrl.trim()) {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    refreshToolbarState()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: normalizeUrl(nextUrl) }).run()
  refreshToolbarState()
}

function clearFormatting() {
  editor.value?.chain().focus().unsetAllMarks().clearNodes().run()
  refreshToolbarState()
}

function refreshToolbarState(currentEditor = editor.value) {
  if (!currentEditor) return

  toolbarState.bold = currentEditor.isActive('bold')
  toolbarState.italic = currentEditor.isActive('italic')
  toolbarState.bulletList = currentEditor.isActive('bulletList')
  toolbarState.link = currentEditor.isActive('link')
  toolbarState.headingLevel = getActiveHeadingLevel(currentEditor)
}

function getActiveHeadingLevel(currentEditor) {
  const activeLevel = headingLevels.find((level) => currentEditor.isActive('heading', { level }))
  return activeLevel ? String(activeLevel) : 'paragraph'
}

function normalizeUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
</script>

<style scoped>
.rich-editor{display:grid;overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--field-bg)}.rich-editor__toolbar{display:flex;gap:4px;align-items:center;border-bottom:1px solid var(--border-color);padding:6px;background:var(--control-bg)}.rich-editor__toolbar button{display:grid;place-items:center;width:30px;height:30px;border:1px solid transparent;border-radius:7px;color:var(--text-secondary);background:transparent;font-size:14px;font-weight:850}.rich-editor__toolbar button:hover,.rich-editor__toolbar button.active{border-color:var(--border-color);color:var(--text-primary);background:var(--card-solid)}.rich-editor__content{min-height:200px;max-height:340px;overflow:auto}.rich-editor__content :deep(.rich-editor__area){min-height:200px;padding:12px;color:var(--text-primary);line-height:1.55;outline:none}.rich-editor__content :deep(.rich-editor__area p.is-editor-empty:first-child::before){float:left;height:0;color:var(--text-muted);content:attr(data-placeholder);pointer-events:none}.rich-editor__content :deep(h3){margin:0 0 8px;font-size:18px}.rich-editor__content :deep(p){margin:0 0 9px}.rich-editor__content :deep(ul){margin:0 0 10px;padding-left:20px}.rich-editor__content :deep(a){color:var(--accent);font-weight:750}.rich-editor__content :deep(.ProseMirror){min-height:200px}.rich-editor__content :deep(.ProseMirror > *:last-child){margin-bottom:0}
.rich-editor {
  border-color: color-mix(in srgb, var(--accent) 14%, var(--border-color));
  border-radius: 8px;
  background: var(--panel-bg);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent);
}

.rich-editor__toolbar {
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--card-solid) 88%, transparent), transparent),
    var(--control-bg);
}

.rich-editor__group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rich-editor__heading-select {
  width: 168px;
}

.rich-editor__toolbar button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

.rich-editor__toolbar button:hover {
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-color));
}

.rich-editor__toolbar button.active {
  border-color: color-mix(in srgb, var(--accent) 36%, var(--border-color));
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--card-solid));
}

.rich-editor__content {
  min-height: 300px;
  max-height: min(520px, 58vh);
  background: var(--field-bg);
}

.rich-editor__content :deep(.rich-editor__area) {
  min-height: 300px;
  padding: 18px;
  font-size: 14px;
}

.rich-editor__content :deep(.rich-editor__area:focus) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent);
}

.rich-editor__content :deep(h3) {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-size: 22px;
  line-height: 1.16;
}

.rich-editor__content :deep(h1),
.rich-editor__content :deep(h2),
.rich-editor__content :deep(h3),
.rich-editor__content :deep(h4),
.rich-editor__content :deep(h5),
.rich-editor__content :deep(h6) {
  margin: 0 0 12px;
  color: var(--text-primary);
  font-weight: 850;
  line-height: 1.14;
}

.rich-editor__content :deep(h1) {
  font-size: 30px;
}

.rich-editor__content :deep(h2) {
  font-size: 26px;
}

.rich-editor__content :deep(h3) {
  font-size: 22px;
}

.rich-editor__content :deep(h4) {
  font-size: 18px;
}

.rich-editor__content :deep(h5) {
  font-size: 15px;
}

.rich-editor__content :deep(h6) {
  color: var(--text-secondary);
  font-size: 13px;
  letter-spacing: 0;
  text-transform: uppercase;
}

.rich-editor__content :deep(p) {
  margin: 0 0 12px;
}

.rich-editor__content :deep(ul) {
  margin: 0 0 12px;
  padding-left: 22px;
}

.rich-editor__content :deep(li + li) {
  margin-top: 5px;
}

.rich-editor__content :deep(.ProseMirror > *:last-child) {
  margin-bottom: 0;
}

@media (max-width: 560px) {
  .rich-editor__toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .rich-editor__group {
    min-width: 0;
    flex-wrap: wrap;
  }

  .rich-editor__heading-select {
    grid-column: 1 / -1;
    width: 100%;
    order: 3;
  }
}
</style>
