import { describe, expect, it } from "vite-plus/test";
import { AnchorLink } from "./anchor-link";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("AnchorLink", () => {
  it("対象のアンカーを設定できる", () => {
    const { editor } = createEditor([AnchorLink], "<h1>見出し1</h1><h1>見出し2</h1>");

    editor.commands.setTextSelection(1);

    expect(editor.commands.setAnchorLink("section")).toBe(true);
    expect(editor.getAttributes("heading").anchorLink).toBe("section");
    expect(editor.getJSON().content?.[0].attrs?.anchorLink).toBe("section");

    destroyEditor(editor);
  });

  it("対象のアンカーを解除できる", () => {
    const { editor } = createEditor(
      [AnchorLink],
      '<h1 id="section" data-type="anchor_link">対象の見出し</h1><h1 id="other-section" data-type="anchor_link">別の見出し</h1>',
    );

    editor.commands.setTextSelection(1);

    expect(editor.commands.unsetAnchorLink()).toBe(true);
    expect(editor.getAttributes("heading").anchorLink).toBe("");
    expect(editor.getJSON().content?.[0].attrs?.anchorLink).toBe("");
    expect(editor.getJSON().content?.[1].attrs?.anchorLink).toBe("other-section");

    destroyEditor(editor);
  });

  it("ネスト内から設定すると文書直下のノードにアンカーを設定する", () => {
    const anchorLink = AnchorLink.configure({ types: ["heading", "paragraph", "blockquote"] });
    const { editor } = createEditor([anchorLink], "<blockquote><p>入れ子の文章</p></blockquote>");

    editor.commands.setTextSelection(3);

    expect(editor.state.selection.$anchor.depth).toBeGreaterThan(1);
    expect(editor.commands.setAnchorLink("section")).toBe(true);
    expect(editor.getJSON().content?.[0].attrs?.anchorLink).toBe("section");
    expect(editor.state.doc.firstChild?.firstChild?.attrs.anchorLink).toBe("");

    destroyEditor(editor);
  });

  it("ネスト内から解除すると文書直下のノードのアンカーを解除する", () => {
    const anchorLink = AnchorLink.configure({ types: ["heading", "paragraph", "blockquote"] });
    const { editor } = createEditor(
      [anchorLink],
      '<blockquote id="section" data-type="anchor_link"><p>入れ子の文章</p></blockquote>',
    );

    editor.commands.setTextSelection(3);

    expect(editor.commands.unsetAnchorLink()).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.anchorLink).toBe("");
    expect(editor.state.doc.firstChild?.firstChild?.attrs.anchorLink).toBe("");

    destroyEditor(editor);
  });

  it("改行時に改行先へアンカーを引き継がない", () => {
    const { editor } = createEditor(
      [AnchorLink],
      '<p id="section" data-type="anchor_link">入れ子ではない文章</p>',
    );

    editor.commands.focus();
    editor.commands.setTextSelection(5);

    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    expect(editor.state.doc.firstChild?.attrs.anchorLink).toBe("section");
    expect(editor.state.doc.lastChild?.attrs.anchorLink).toBe("");

    destroyEditor(editor);
  });

  it("ネスト内で改行しても親ノードのアンカーを維持する", () => {
    const anchorLink = AnchorLink.configure({ types: ["heading", "paragraph", "blockquote"] });
    const { editor } = createEditor(
      [anchorLink],
      '<blockquote id="section" data-type="anchor_link"><p>入れ子の文章</p></blockquote>',
    );

    editor.commands.focus();
    editor.commands.setTextSelection(5);
    editor.view.dom.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    const blockquote = editor.state.doc.firstChild;
    expect(blockquote?.attrs.anchorLink).toBe("section");
    expect(blockquote?.childCount).toBe(2);
    expect(blockquote?.child(0).attrs.anchorLink).toBe("");
    expect(blockquote?.child(1).attrs.anchorLink).toBe("");

    destroyEditor(editor);
  });

  it("別ノードに設定済みのアンカー名は拒否する", () => {
    const { editor } = createEditor(
      [AnchorLink],
      '<h1 id="section" data-type="anchor_link">見出し1</h1><h1>見出し2</h1>',
    );

    editor.commands.setTextSelection(9);

    expect(editor.commands.setAnchorLink("section")).toBe(false);
    expect(editor.getJSON().content?.[1].attrs?.anchorLink).toBe("");

    destroyEditor(editor);
  });
});
