import { describe, expect, it } from "vite-plus/test";
import { ClassName } from "./classname";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("ClassName", () => {
  it("setClassNameでクラスを付与し、重複を防止する", () => {
    const { editor } = createEditor([ClassName], '<p class="existing">test</p>');
    expect(editor.commands.setClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("lead existing");
    expect(editor.commands.setClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("lead existing");
    destroyEditor(editor);
  });

  it("unsetClassNameで指定したクラスだけを削除する", () => {
    const { editor } = createEditor([ClassName], '<p class="lead existing">test</p>');
    expect(editor.commands.unsetClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("existing");
    destroyEditor(editor);
  });

  it("toggleClassNameで既存のクラスを削除できる", () => {
    const { editor } = createEditor([ClassName], '<p class="lead">test</p>');
    expect(editor.commands.toggleClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("");
    destroyEditor(editor);
  });

  it("対象外のノードでは変更しない", () => {
    const { editor } = createEditor([ClassName.configure({ types: ["heading"] })]);
    expect(editor.commands.toggleClassName("ignored")).toBe(false);
    destroyEditor(editor);
  });
});
