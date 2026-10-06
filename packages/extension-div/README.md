# ExtensionDiv

Tiptap に `div`、レスポンシブグリッド、sticky ノードを追加します。

## 使い方

```bash
import { Div, Grid, Sticky } from "@aysys/extension-div";

const extensions = [Div, Grid, Sticky];
editor.commands.wrapDiv();
editor.commands.createGrid(3, "1rem", true);
editor.commands.createSticky("1rem", "top");
```

`Div` は選択範囲を div で囲む・解除するコマンドを提供します。`Grid` は列数や間隔、レスポンシブ動作を指定して作成・更新できます。`Sticky` は上下いずれかへの固定位置を設定できます。
