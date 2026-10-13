import { Extension } from "@tiptap/core";
import { Table as TiptapTable, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

import { TableAttributes } from "./table-attributes";
import { StyledTableView } from "./table-view";

export const Table = TiptapTable.configure({ View: StyledTableView });

export const TableKit = Extension.create({
  name: "tableKit",
  addExtensions() {
    return [Table, TableRow, TableCell, TableHeader, TableAttributes];
  },
});
