import { describe, expect, it } from "vite-plus/test";
import { createEditor, destroyEditor } from "../../../tests/helpers";
import { EmbedMedia } from "./embed-media";

describe("EmbedMedia", () => {
  it("iframeノードを挿入できる", () => {
    const { editor } = createEditor([EmbedMedia], "<p>text</p>");

    expect(
      editor.commands.insertIFrame({
        src: "about:blank",
        width: "640",
        height: "360",
        aspectRatio: "16 / 9",
        maxWidth: "100%",
      }),
    ).toBe(true);

    const paragraph = editor.getJSON().content?.[0];
    expect(paragraph?.type).toBe("iframe-wrapper");
    expect(paragraph?.content?.[0]).toMatchObject({
      type: "embedMedia",
      attrs: {
        src: "about:blank",
        width: "640",
        height: "360",
        aspectRatio: "16 / 9",
        maxWidth: "100%",
      },
    });

    destroyEditor(editor);
  });

  it("iframeの属性を更新できる", () => {
    const { editor } = createEditor([EmbedMedia], "<p>text</p>");
    editor.commands.insertIFrame({
      src: "about:blank",
      width: "640",
      height: "360",
      aspectRatio: "16 / 9",
      maxWidth: "100%",
    });

    editor.commands.setNodeSelection(1);
    expect(
      editor.commands.updateIFrame({
        src: "about:blank",
        width: "800",
        height: "450",
        aspectRatio: "16 / 9",
        maxWidth: "80%",
      }),
    ).toBe(true);

    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      attrs: {
        src: "about:blank",
        width: "800",
        height: "450",
        maxWidth: "80%",
      },
    });

    destroyEditor(editor);
  });

  it("HTMLからiframeを読み込める", () => {
    const { editor } = createEditor(
      [EmbedMedia],
      '<p><iframe src="about:blank" width="640" height="360" style="aspect-ratio: 16 / 9; max-width: 100%;"></iframe></p>',
    );

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "iframe-wrapper" });
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "embedMedia",
      attrs: {
        src: "about:blank",
        width: "640",
        height: "360",
        aspectRatio: "16 / 9",
        maxWidth: "100%",
      },
    });

    destroyEditor(editor);
  });

  it("data-typeがないp内のiframeを読み込める", () => {
    const { editor } = createEditor(
      [EmbedMedia],
      '<p><iframe src="about:blank" width="640" height="360"></iframe></p>',
    );

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "iframe-wrapper" });
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "embedMedia",
      attrs: { src: "about:blank", width: "640", height: "360" },
    });

    destroyEditor(editor);
  });

  it("data-typeがない任意の要素内のiframeを読み込める", () => {
    const { editor } = createEditor(
      [EmbedMedia],
      '<div><iframe src="about:blank" width="640" height="360"></iframe></div>',
    );

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "iframe-wrapper" });
    expect(editor.getJSON().content?.[0].content?.[0]).toMatchObject({
      type: "embedMedia",
      attrs: { src: "about:blank", width: "640", height: "360" },
    });

    destroyEditor(editor);
  });

  it("iframeの属性をHTMLへ出力できる", () => {
    const { editor, element } = createEditor([EmbedMedia], "<p>text</p>");
    editor.commands.insertIFrame({
      src: "about:blank",
      width: "640",
      height: "360",
      aspectRatio: "16 / 9",
      maxWidth: "100%",
    });

    const iframe = element.querySelector("iframe");
    expect(element.querySelector("p")?.getAttribute("data-type")).toBe("iframe-wrapper");
    expect(iframe?.getAttribute("src")).toBe("about:blank");
    expect(iframe?.getAttribute("width")).toBe("640");
    expect(iframe?.getAttribute("height")).toBe("360");
    expect(iframe?.style.aspectRatio).toBe("16 / 9");
    expect(iframe?.style.maxWidth).toBe("100%");
    expect(iframe?.getAttribute("loading")).toBe("lazy");

    destroyEditor(editor);
  });

  it.each(["java\nscript:alert(1)", "https:\n//example.com", "https://example.com\u0000"])(
    "制御文字を含むiframeのURLを拒否する: %s",
    (src) => {
      const { editor } = createEditor([EmbedMedia], "<p>text</p>");

      expect(
        editor.commands.insertIFrame({
          src,
          width: "640",
          height: "360",
          aspectRatio: "16 / 9",
          maxWidth: "100%",
        }),
      ).toBe(false);

      destroyEditor(editor);
    },
  );
});
