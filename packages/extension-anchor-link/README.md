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

- アンカーリンクは `types` に指定した TOP ノード（文書直下のノード）にのみ設定可能。
- 入れ子内で操作した場合も TOP ノードが対象。
- `setAnchorLink(name)` は、`name` が対象ノードにすでに存在する場合は失敗する。
- 同じノードへの同名再設定も重複として失敗する。
- `unsetAnchorLink()` は、対象ノードにアンカーが設定されている場合に解除します。
- アンカー付きノード内で Enter を押すと、分割後のノードにはアンカーを引き継ぎません。

## コマンド

```ts
editor.commands.setAnchorLink("section"); // アンカーを設定
editor.commands.unsetAnchorLink(); // アンカーを解除
```
