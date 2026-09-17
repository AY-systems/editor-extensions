import { describe, expect, it } from "vite-plus/test";
import { Picture } from "./picture";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Picture", () => {
  it("sourceとインライン画像を持つPictureを解析・描画できる", () => {
    const { editor } = createEditor(
      [Picture],
      '<picture><source srcset="large.webp" media="screen"><img src="image.webp" alt="sample"></picture>',
    );

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "picture",
      content: [
        { type: "source", attrs: { srcset: "large.webp", media: "screen" } },
        { type: "inline-image", attrs: { src: "image.webp", alt: "sample" } },
      ],
    });
    expect(editor.getHTML()).toContain('<picture data-type="picture">');

    destroyEditor(editor);
  });

  it("有効なPictureをparagraphに戻せる", () => {
    const { editor } = createEditor(
      [Picture],
      '<picture><source srcset="image.webp"><img src="image.webp"></picture>',
    );

    expect(editor.commands.pictureToImage()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");

    destroyEditor(editor);
  });
});
