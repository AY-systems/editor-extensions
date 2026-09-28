import { describe, expect, it } from "vite-plus/test";
import { BlockImage, InlineImage } from "./image";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Picture画像", () => {
  it("ブロック画像を挿入できる", () => {
    const { editor } = createEditor([BlockImage], "<p>text</p>");

    expect(editor.commands.setBlockImage({ src: "block.webp", alt: "block" })).toBe(true);
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "blockImage",
      attrs: { src: "block.webp", alt: "block" },
    });

    destroyEditor(editor);
  });

  it("インライン画像を挿入できる", () => {
    const { editor } = createEditor([InlineImage], "<p>text</p>");

    expect(editor.commands.setInlineImage({ src: "inline.webp" })).toBe(true);
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "inlineImage",
      attrs: { src: "inline.webp" },
    });

    destroyEditor(editor);
  });

  it("新しいdata-typeも解析できる", () => {
    const { editor } = createEditor(
      [BlockImage, InlineImage],
      '<p><img data-type="inlineImage" src="inline.webp"></p><img data-type="blockImage" src="block.webp">',
    );

    expect(editor.getJSON().content).toMatchObject([
      { type: "paragraph", content: [{ type: "inlineImage" }] },
      { type: "blockImage", attrs: { src: "block.webp" } },
    ]);

    destroyEditor(editor);
  });
});
