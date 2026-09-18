import { describe, expect, it } from "vite-plus/test";
import { Grid } from "./grid";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Grid", () => {
  it("Gridを作成できる", () => {
    const { editor } = createEditor([Grid]);
    expect(editor.commands.createGrid(3, "1rem", true)).toBe(true);
    expect(editor.getAttributes("grid")).toMatchObject({
      gridCols: 3,
      gap: "1rem",
      isResponsive: true,
    });
    destroyEditor(editor);
  });

  it("Gridの属性を更新できる", () => {
    const { editor } = createEditor([Grid], '<div data-type="grid"><p>テスト</p></div>');
    expect(editor.commands.updateGrid(4)).toBe(true);
    expect(editor.getAttributes("grid").gridCols).toBe(4);
    destroyEditor(editor);
  });
});
