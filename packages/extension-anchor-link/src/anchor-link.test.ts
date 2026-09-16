import { describe, expect, it } from "vite-plus/test";
import { AnchorLink } from "./anchor-link";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("AnchorLink", () => {
  it("アンカーを設定できる", () => {
    const { editor } = createEditor([AnchorLink], "<h1>見出し1</h1><h1>見出し2</h1>");
    editor.commands.setTextSelection(1);
    expect(editor.commands.setAnchorLink("section")).toBe(true);
    expect(editor.getAttributes("heading").anchorLink).toBe("section");
    expect(editor.getJSON().content?.[0].attrs?.anchorLink).toBe("section");
    destroyEditor(editor);
  });

  it("アンカーを解除できる", () => {
    const { editor } = createEditor([AnchorLink], '<h1 id="section">見出し</h1>');
    expect(editor.commands.unsetAnchorLink()).toBe(true);
    expect(editor.getAttributes("heading").anchorLink).toBe("");
    expect(editor.getJSON().content?.[0].attrs?.anchorLink).toBe("");
    destroyEditor(editor);
  });

  it("重複アンカーを拒否できる", () => {
    const { editor } = createEditor([AnchorLink], '<h1 id="section">見出し1</h1><h1>見出し2</h1>');
    editor.commands.setTextSelection(9);
    expect(editor.commands.setAnchorLink("section")).toBe(false);
    destroyEditor(editor);
  });
});
