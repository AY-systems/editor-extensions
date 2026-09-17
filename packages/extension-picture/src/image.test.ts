import { describe, expect, it } from "vite-plus/test";
import { BlockImage, InlineImage } from "./image";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Picture画像", () => {
  it("ブロック画像を挿入できる", () => {
    const { editor } = createEditor([BlockImage], "<p>text</p>");

    expect(editor.commands.setBlockImage({ src: "block.webp", alt: "block" })).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "block-image",
      attrs: { src: "block.webp", alt: "block" },
    });

    destroyEditor(editor);
  });

  it("インライン画像を挿入できる", () => {
    const { editor } = createEditor([InlineImage], "<p>text</p>");

    expect(editor.commands.setInlineImage({ src: "inline.webp" })).toBe(true);
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "inline-image",
      attrs: { src: "inline.webp" },
    });

    destroyEditor(editor);
  });
});
