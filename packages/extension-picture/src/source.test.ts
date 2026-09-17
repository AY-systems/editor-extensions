import { describe, expect, it } from "vite-plus/test";
import { PictureKit } from "./picture";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Source", () => {
  it("source属性を解析・描画できる", () => {
    const { editor } = createEditor(
      [PictureKit],
      '<picture><source srcset="small.webp 480w" media="(max-width: 600px)"><img src="image.webp"></picture>',
    );

    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "source",
      attrs: {
        srcset: "small.webp 480w",
        media: "(max-width: 600px)",
      },
    });
    expect(editor.getHTML()).toContain("<source");
    expect(editor.getHTML()).toContain('srcset="small.webp 480w"');
    expect(editor.getHTML()).toContain('media="(max-width: 600px)"');

    destroyEditor(editor);
  });

  it("sourceノードを挿入・更新できる", () => {
    const { editor } = createEditor(
      [PictureKit],
      '<picture><img src="image.webp"></picture>',
    );

    expect(editor.commands.setSource({ srcset: "image.webp", media: "screen" })).toBe(true);
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "source",
      attrs: { srcset: "image.webp", media: "screen" },
    });

    destroyEditor(editor);
  });

  it("Picture外ではsourceを挿入しない", () => {
    const { editor } = createEditor([PictureKit], "<p>text</p>");

    expect(editor.commands.setSource({ srcset: "image.webp", media: "screen" })).toBe(false);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");

    destroyEditor(editor);
  });
});
