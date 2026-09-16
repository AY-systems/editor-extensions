import { describe, expect, it } from "vite-plus/test";
import { Sticky } from "./sticky";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Sticky", () => {
  it("Stickyを作成できる", () => {
    const { editor } = createEditor([Sticky]);
    expect(editor.commands.createSticky("2rem", "top")).toBe(true);
    expect(editor.getAttributes("sticky")).toMatchObject({ top: "2rem" });
    destroyEditor(editor);
  });

  it("Stickyを削除できる", () => {
    const { editor } = createEditor([Sticky], "<div data-type=\"sticky\"><p>テスト</p></div>");
    expect(editor.commands.removeSticky()).toBe(true);
    expect(editor.isActive("sticky")).toBe(false);
    destroyEditor(editor);
  });
});
