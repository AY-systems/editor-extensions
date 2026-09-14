<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";

import { ref, watch } from "vue";
import { advancedExtensions, requiredExtensions } from "./extensions";

const modelValue = ref<string>(``);

const editor = useEditor({
  content: modelValue.value,
  extensions: [...requiredExtensions, ...advancedExtensions],
  onUpdate: (e) => {
    modelValue.value = e.editor.getHTML();
  },
  editorProps: {
    attributes: {
      class: "editor_view p-4",
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
  <div class="m-4 rounded border">
    <EditorContent :editor />
  </div>
</template>
<style>
div.editor_view {
  > * {
    margin: 1rem 0;
  }

  > :first-child {
    margin-top: 0;
  }

  > :last-child {
    margin-bottom: 0;
  }
}
</style>
