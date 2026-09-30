# AnchorLink

Tiptap のノードにアンカー ID を設定する拡張機能です。アンカー ID は HTML の `id` 属性として保存され、エディタ上では `#ID` のラベルを表示します。

## インストール

```bash
npm install @aysys/extension-anchor-link
```

## 対象ノード

初期設定では `heading`、`paragraph`、`div` が対象です。`types` で変更できます。

```ts
AnchorLink.configure({ types: ["heading", "paragraph", "div"] });
```

## 動作仕様

- アンカーラベルは文書直下のノードに表示します。入れ子ノードの `id` は HTML に保存されますが、エディタ上のラベル表示対象にはなりません。
- 入れ子内にカーソルがある場合、設定・解除コマンドは文書直下の親ノードを対象にします。そのノード型も `types` に含まれている必要があります。
- `setAnchorLink(name)` は、`name` が対象ノードにすでに存在する場合は失敗します。同じノードへの同名再設定も重複として失敗します。
- 重複判定は文書全体の `types` 対象ノード間で行います。
- `unsetAnchorLink()` は、対象ノードにアンカーが設定されている場合に解除します。
- アンカー付きノード内で Enter を押すと、分割後のノードにはアンカーを引き継ぎません。

## コマンド

```ts
editor.commands.setAnchorLink("section"); // アンカーを設定
editor.commands.unsetAnchorLink(); // アンカーを解除
```
