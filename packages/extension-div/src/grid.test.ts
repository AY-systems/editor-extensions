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

    const reloadedGrid = editor.getJSON().content?.find(({ type }) => type === "grid");
    expect(reloadedGrid?.attrs?.cols).toBe(3);
    expect(reloadedGrid?.attrs?.responsive).toBe(true);
    expect(typeof reloadedGrid?.attrs?.responsive).toBe("boolean");
    expect(editor.getHTML()).toContain(responsiveColumns);

    destroyEditor(editor);
  });

  it("Gridの属性を更新できる", () => {
    const { editor } = createEditor([Grid], '<div data-type="grid"><p>テスト</p></div>');

    expect(editor.commands.updateGrid(4)).toBe(true);
    expect(editor.getAttributes("grid").cols).toBe(4);

    destroyEditor(editor);
  });

  it("列数を上限以内に制限する", () => {
    const { editor } = createEditor([Grid]);

    expect(editor.commands.createGrid(13, "1rem", true)).toBe(true);
    expect(editor.getAttributes("grid").cols).toBe(12);
    expect(editor.getHTML()).toContain('cols="12"');

    editor.commands.updateGrid(13);
    expect(editor.getAttributes("grid").cols).toBe(12);

    editor.commands.setContent(
      '<div data-type="grid" cols="13" responsive="true"><p>テスト</p></div>',
    );
    expect(editor.getAttributes("grid").cols).toBe(12);
    expect(editor.getHTML()).toContain('cols="12"');

    destroyEditor(editor);
  });

  it("maxColumnsオプションで列数の上限を変更できる", () => {
    const { editor } = createEditor([Grid.configure({ maxColumns: 5 })]);

    expect(editor.commands.createGrid(6, "1rem", true)).toBe(true);
    expect(editor.getAttributes("grid").cols).toBe(5);
    expect(editor.getHTML()).toContain('cols="5"');

    editor.commands.setContent(
      '<div data-type="grid" cols="6" responsive="true"><p>テスト</p></div>',
    );
    expect(editor.getAttributes("grid").cols).toBe(5);

    destroyEditor(editor);
  });

  it.each([2.5, Number.NaN, 0, -1])("無効なmaxColumns %s は既定値を使う", (maxColumns) => {
    const { editor } = createEditor([Grid.configure({ maxColumns })]);

    expect(editor.commands.createGrid(13)).toBe(true);
    expect(editor.getAttributes("grid").cols).toBe(12);

    destroyEditor(editor);
  });
});
