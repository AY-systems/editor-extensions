<script setup lang="ts">
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import NodeTag from "extension-ui-node-tag";
import { watch } from "vue";

const modelValue = defineModel<string>();

const editor = useEditor({
  content: modelValue.value,
  extensions: [StarterKit, NodeTag],
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
/* ノード名表示コンテナ */
.ui-node-name-container {
  position: absolute;
  pointer-events: none; /* 子要素にイベントを渡す */
}

/* ノード名表示 */
.ui-node-name {
  position: absolute;
  font-size: 10px;
  color: gray;
  user-select: none;
  padding: 0;
  line-height: 1;
  background-color: white;
  margin: 0 4px;
}
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

  > *,
  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  td,
  div:not(li[data-type="timelineItem"] > div):not(.ProseMirror-gapcursor),
  li[data-type="timelineItem"] {
    border: 1px dashed #aaa;
  }
}
</style>
