import { describe, expect, it } from "vite-plus/test";
import { createEditor, destroyEditor } from "../../../tests/helpers";
import { Table } from "./table";

describe("Table", () => {
  it("ヘッダー行付きのテーブルを作成できる", () => {
    const { editor } = createEditor([Table]);

    expect(editor.commands.insertTable({ rows: 2, cols: 3, withHeaderRow: true })).toBe(true);
    const rows = editor.view.dom.querySelectorAll("table tr");

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll("th")).toHaveLength(3);
    expect(rows[1].querySelectorAll("td")).toHaveLength(3);

    destroyEditor(editor);
  });

  it("ヘッダー行なしのテーブルを作成できる", () => {
    const { editor } = createEditor([Table]);

    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false })).toBe(true);
    const rows = editor.view.dom.querySelectorAll("table tr");

    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll("th")).toHaveLength(0);
    expect(rows[0].querySelectorAll("td")).toHaveLength(2);
    expect(rows[1].querySelectorAll("td")).toHaveLength(2);

    destroyEditor(editor);
  });
});
