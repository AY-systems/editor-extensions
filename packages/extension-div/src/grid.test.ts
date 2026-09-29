import { describe, expect, it } from "vite-plus/test";
import { Grid } from "./grid";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("Grid", () => {
  it("固定列数でGridを作成できる", () => {
    const { editor } = createEditor([Grid]);

    expect(editor.commands.createGrid(3, "1rem")).toBe(true);
    expect(editor.getAttributes("grid")).toMatchObject({
      display: "grid",
      cols: 3,
      gap: "1rem",
    });
    expect(editor.getHTML()).toContain("grid-template-columns: repeat(3, 1fr)");

    destroyEditor(editor);
  });

  it("レスポンシブ時は指定列数を上限にstyleを出力する", () => {
    const { editor } = createEditor([Grid]);
    const responsiveColumns =
      "grid-template-columns: repeat(auto-fit, minmax(min(100%, max(200px, calc((100% - 1rem - 1rem) / 3))), 1fr))";

    expect(editor.commands.createGrid(3, "1rem", true)).toBe(true);
    expect(editor.getAttributes("grid")).toMatchObject({
      cols: 3,
      gap: "1rem",
      responsive: true,
    });
    expect(editor.getHTML()).toContain(responsiveColumns);
    expect(editor.getHTML()).toContain('responsive="true"');
    expect(editor.getHTML()).toContain('cols="3"');

    editor.commands.setContent(editor.getHTML());

    destroyEditor(editor);
  });

  it("Gridの属性を更新できる", () => {
    const { editor } = createEditor([Grid]);

    expect(editor.commands.createGrid(3, "1rem")).toBe(true);
    expect(editor.commands.updateGrid(4)).toBe(true);
    expect(editor.getAttributes("grid").cols).toBe(4);

    destroyEditor(editor);
  });

  it("列数が上限を超えるコマンドを拒否", () => {
    const { editor } = createEditor([Grid]);

    expect(editor.commands.createGrid(100, "1rem", true)).toBe(false);

    destroyEditor(editor);
  });

  it("maxColumnsオプションで列数の上限を設定できる", () => {
    const { editor } = createEditor([Grid.configure({ maxColumns: 5 })]);

    expect(editor.commands.createGrid(6, "1rem", true)).toBe(false);

    destroyEditor(editor);
  });
});
