import { describe, expect, it } from "vite-plus/test";
import { ClassName } from "./classname";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("ClassName", () => {
  it("クラスを追加できる", () => {
    const { editor } = createEditor([ClassName]);
    expect(editor.commands.toggleClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("lead");
    destroyEditor(editor);
  });

  it("同じクラスをtoggleで削除できる", () => {
    const { editor } = createEditor([ClassName], '<p class="lead">テスト</p>');
    expect(editor.commands.toggleClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("");
    destroyEditor(editor);
  });

  it("対象外ノードでは変更しない", () => {
    const { editor } = createEditor([ClassName.configure({ types: ["heading"] })]);
    expect(editor.commands.toggleClassName("ignored")).toBe(false);
    destroyEditor(editor);
  });
});
