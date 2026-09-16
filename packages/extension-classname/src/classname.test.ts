import { describe, expect, it } from "vite-plus/test";
import { ClassName } from "./classname";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("ClassName", () => {
  it("クラスを追加・削除し、複数クラスを共存させる", () => {
    const { editor } = createEditor([ClassName]);
    expect(editor.commands.toggleClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("lead");
    expect(editor.commands.toggleClassName("wide")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("wide lead");
    expect(editor.commands.toggleClassName("lead")).toBe(true);
    expect(editor.getAttributes("paragraph").className).toBe("wide");
    destroyEditor(editor);
  });

  it("対象外ノードでは変更しない", () => {
    const { editor } = createEditor([ClassName.configure({ types: ["heading"] })]);
    expect(editor.commands.toggleClassName("ignored")).toBe(false);
    destroyEditor(editor);
  });
});
