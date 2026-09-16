import { describe, expect, it } from "vite-plus/test";
import { Div } from "./div";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Div", () => {
  it("Divをwrap、unwrap、toggleできる", () => {
    const { editor } = createEditor([Div]);
    expect(editor.commands.wrapDiv()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("div");
    expect(editor.commands.toggleDiv()).toBe(true);
    expect(editor.getJSON().content?.[0].type).toBe("paragraph");
    destroyEditor(editor);
  });
});
