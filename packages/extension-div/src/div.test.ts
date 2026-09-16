import { describe, expect, it } from "vite-plus/test";
import { Div } from "./div";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Div", () => {
  it("Divをwrapできる", () => {
    const { editor } = createEditor([Div]);
    expect(editor.commands.wrapDiv()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("div");
    destroyEditor(editor);
  });
  it("Divをunwrapできる", () => {
    const { editor } = createEditor([Div], "<div><p>テスト</p></div>");
    expect(editor.commands.unwrapDiv()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");
    destroyEditor(editor);
  });
  it("Divをtoggleで解除できる", () => {
    const { editor } = createEditor([Div], "<div><p>テスト</p></div>");
    expect(editor.commands.toggleDiv()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");
    destroyEditor(editor);
  });
});
