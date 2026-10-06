# ExtensionTable

Tiptap の標準テーブルにセル寸法や装飾属性、テーブル挿入コマンドを追加します。

## Installation

```bash
npm install @aysys/extension-table @tiptap/extension-table
```

## 使い方

```ts
import { Table } from "@aysys/extension-table";

const extensions = [Table];
editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
```

`insertTable` のオプションで行数、列数、ヘッダー行の有無を指定できます。テーブル、行、セル、ヘッダーセルの拡張も `Table` からまとめて登録されます。
