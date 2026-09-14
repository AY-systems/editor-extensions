<script setup lang="ts">
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { watch } from "vue";

const modelValue = defineModel<string>();

const editor = useEditor({
  content: modelValue.value,
  extensions: [StarterKit],
  onUpdate: (e) => {
    modelValue.value = e.editor.getHTML();
  },
  editorProps: {
    attributes: {
      class: "editor_view border rounded p-4",
    },
  },
});

watch(
  () => modelValue.value,
  () => {
    if (!modelValue.value || modelValue.value === editor.value?.getHTML()) return;
    editor.value?.commands.setContent(modelValue.value, { emitUpdate: false });
  },
);
</script>
<template>
  <div class="relative m-4">
    <EditorContent :editor />
  </div>
</template>
<style>
div.editor_view {
  /* すべてのtop-node間にmarginを追加　 */
  > * {
    margin: 1rem 0;
  }
  /* 最初のtop-nodeから上側marginを取り除く */
  > :first-child {
    margin-top: 0;
  }
  /* 最後のtop-nodeから下側marginを取り除く */
  > :last-child {
    margin-bottom: 0;
  }
}
</style>
