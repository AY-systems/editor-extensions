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
    expect(paragraph?.type).toBe("paragraph");
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
        src: "about:srcdoc",
        width: "800",
        height: "450",
        aspectRatio: "16 / 9",
        maxWidth: "80%",
      }),
    ).toBe(true);

    expect(editor.getJSON().content?.[0].content?.[0].attrs).toMatchObject({
      src: "about:srcdoc",
      width: "800",
      height: "450",
      maxWidth: "80%",
    });

    destroyEditor(editor);
  });

  it("HTMLからiframeを読み込める", () => {
    const { editor } = createEditor(
      [EmbedMedia],
      '<p><iframe src="about:blank" width="640" height="360" style="aspect-ratio: 16 / 9; max-width: 100%;"></iframe></p>',
    );

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
    expect(iframe?.getAttribute("src")).toBe("about:blank");
    expect(iframe?.getAttribute("width")).toBe("640");
    expect(iframe?.getAttribute("height")).toBe("360");
    expect(iframe?.style.aspectRatio).toBe("16 / 9");
    expect(iframe?.style.maxWidth).toBe("100%");
    expect(iframe?.getAttribute("loading")).toBe("lazy");

    destroyEditor(editor);
  });
});
