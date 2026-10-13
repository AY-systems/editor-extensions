import { Extension } from "@tiptap/core";
import {
  Table as TiptapTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import type {
  TableCellOptions,
  TableHeaderOptions,
  TableOptions,
  TableRowOptions,
} from "@tiptap/extension-table";

import { TableAttributes, type TableAttributesOptions } from "./table-attributes";
import { StyledTableView } from "./table-view";

export interface TableKitOptions {
  table: Partial<TableOptions> | false;
  tableCell: Partial<TableCellOptions> | false;
  tableHeader: Partial<TableHeaderOptions> | false;
  tableRow: Partial<TableRowOptions> | false;
  tableAttributes: Partial<TableAttributesOptions> | false;
}

export const Table = TiptapTable.configure({ View: StyledTableView });

export const TableKit = Extension.create<TableKitOptions>({
  name: "tableKit",
  addExtensions() {
    const extensions = [];

    if (this.options.table !== false) {
      extensions.push(
        Table.configure({
          ...(this.options.table ?? {}),
          View: StyledTableView,
        }),
      );
    }

    if (this.options.tableCell !== false) {
      extensions.push(TableCell.configure(this.options.tableCell ?? {}));
    }

    if (this.options.tableHeader !== false) {
      extensions.push(TableHeader.configure(this.options.tableHeader ?? {}));
    }

    if (this.options.tableRow !== false) {
      extensions.push(TableRow.configure(this.options.tableRow ?? {}));
    }

    if (this.options.tableAttributes !== false) {
      extensions.push(TableAttributes.configure(this.options.tableAttributes ?? {}));
    }

    return extensions;
  },
});
