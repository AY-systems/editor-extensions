import type { DOMOutputSpec } from "@tiptap/pm/model";
import { Extension, mergeAttributes } from "@tiptap/core";
import {
  Table as TiptapTable,
  TableCell as TiptapTableCell,
  TableHeader as TiptapTableHeader,
  TableRow as TiptapTableRow,
} from "@tiptap/extension-table";

import { TextSelection } from "@tiptap/pm/state";

export const TableRow = TiptapTableRow;

const tableCellAttributes = {
  // 列追加に必要
  colspan: {
    default: 1,
  },
  // 行追加に必要
  rowspan: {
    default: 1,
  },
  width: {
    default: "",
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("colWidth") || element.getAttribute("width") || element.style.width,
    renderHTML: (attributes: { width: string }) => {
      if (attributes.width === "") return;
      return {
        width: `${attributes.width}`,
      };
    },
  },
  height: {
    default: "",
    parseHTML: (element: HTMLElement) =>
      element.getAttribute("colHeight") || element.getAttribute("height") || element.style.height,
    renderHTML: (attributes: { height: string }) => {
      if (attributes.height === "") return;
      return {
        height: `${attributes.height}`,
      };
    },
  },
};

export const TableCell = TiptapTableCell.extend({
  addAttributes() {
    return tableCellAttributes;
  },
});

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return tableCellAttributes;
  },
});

export const TableDecoration = Extension.create({
  name: "tableDecoration",
  addOptions() {
    return {
      types: ["table", "tableRow", "tableCell", "tableHeader"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          borderWidth: {
            default: "",
            parseHTML: (element) => element.style.borderWidth,
            renderHTML: (attributes) => {
              if (attributes.borderWidth === "") return null;
              return {
                style: `border-width:${attributes.borderWidth};`,
              };
            },
          },
          borderStyle: {
            default: "",
            parseHTML: (element) => element.style.borderStyle,
            renderHTML: (attributes) => {
              if (attributes.borderStyle === "") return null;
              return {
                style: `border-style:${attributes.borderStyle};`,
              };
            },
          },
          borderColor: {
            default: "",
            parseHTML: (element) => element.style.borderColor,
            renderHTML: (attributes) => {
              if (attributes.borderColor === "") return null;
              return {
                style: `border-color:${attributes.borderColor};`,
              };
            },
          },
          backgroundColor: {
            default: "",
            parseHTML: (element) => element.style.backgroundColor,
            renderHTML: (attributes) => {
              if (attributes.backgroundColor === "") return null;
              return {
                style: `background-color:${attributes.backgroundColor};`,
              };
            },
          },
        },
      },
    ];
  },
});
// テーブル拡張
export const Table = TiptapTable.extend({
  // tableからcolgroupを除く(幅設定をwidthに任せるため)
  renderHTML({ HTMLAttributes }) {
    const table: DOMOutputSpec = [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {}),

      ["tbody", 0],
    ];

    return table;
  },

  // テーブル関連のextensionをまとめて読み込む
  addExtensions() {
    return [TableRow, TableCell, TableHeader, TableDecoration];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      insertTable:
        ({ rows = 3, cols = 3, withHeaderRow = true } = {}) =>
        ({ tr, dispatch, state }) => {
          // セルの作成
          const tableCells = [];
          const headerCells = [];
          for (let i = 0; i < cols; i++) {
            const cell = state.schema.nodes.tableCell.createAndFill({
              width: `${100 / cols}%`,
            });
            tableCells.push(cell);

            // ヘッダーセルが有効な場合
            if (withHeaderRow) {
              const headerCell = state.schema.nodes.tableHeader.createAndFill({
                width: `${100 / cols}%`,
              });
              if (headerCell) {
                headerCells.push(headerCell);
              }
            }
          }

          // 行の作成
          const tableRows = [];
          for (let i = 0; i < rows; i++) {
            const row = state.schema.nodes.tableRow.createChecked(
              {},
              // ヘッダーセルが有効な場合ヘッダー行を追加する
              withHeaderRow && i === 0 ? headerCells : tableCells.filter((cell) => cell !== null),
            );
            tableRows.push(row);
          }

          // テーブルの作成
          const table = state.schema.nodes.table.createChecked({ style: "width:100%;" }, tableRows);

          // テーブルの挿入
          if (dispatch) {
            const offset = tr.selection.from + 1;
            tr.replaceSelectionWith(table)
              .scrollIntoView()
              .setSelection(TextSelection.near(tr.doc.resolve(offset)));
          }

          return true;
        },
    };
  },

  addAttributes() {
    return {
      width: {
        default: "100%",
        parseHTML: (element) =>
          element.getAttribute("tableWidth") || element.getAttribute("width") || element.style.width,
        renderHTML: (attributes) => {
          if (attributes.width === "") return;
          return {
            width: `${attributes.width}`,
          };
        },
      },
      height: {
        default: "auto",
        parseHTML: (element) =>
          element.getAttribute("tableHeight") || element.getAttribute("height") || element.style.height,
        renderHTML: (attributes) => {
          if (attributes.height === "") return;
          return {
            height: `${attributes.height}`,
          };
        },
      },
    };
  },
});
