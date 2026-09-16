import { describe, expect, it } from "vite-plus/test";
import { Sticky } from "./sticky";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Sticky", () => {
  it("Stickyを作成・削除でき、入れ子にはできない", () => {
    const { editor } = createEditor([Sticky]);
    expect(editor.commands.createSticky("2rem", "top")).toBe(true);
    expect(editor.getAttributes("sticky")).toMatchObject({ top: "2rem" });
    expect(editor.commands.createSticky()).toBe(false);
    expect(editor.commands.removeSticky()).toBe(true);
    expect(editor.isActive("sticky")).toBe(false);
    destroyEditor(editor);
  });
});
