import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export function createEditor(extensions: any[] = [], content = "<p>テスト</p>") {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({ element, extensions: [StarterKit, ...extensions], content });
  return { editor, element };
}

export function destroyEditor(editor: Editor) {
  editor.destroy();
  document.body.replaceChildren();
}
