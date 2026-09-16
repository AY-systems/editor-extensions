import { describe, expect, it } from "vite-plus/test";
import { AnchorLink } from "./anchor-link";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("AnchorLink", () => {
  it("アンカーを設定・解除し、重複を拒否する", () => {
    const { editor } = createEditor([AnchorLink], "<h1>見出し1</h1><h1>見出し2</h1>");
    editor.commands.setTextSelection(1);
    expect(editor.commands.setAnchorLink("section")).toBe(true);
    editor.commands.setTextSelection(9);
    expect(editor.commands.setAnchorLink("section")).toBe(false);
    editor.commands.setTextSelection(1);
    expect(editor.commands.unsetAnchorLink()).toBe(true);
    destroyEditor(editor);
  });
});
