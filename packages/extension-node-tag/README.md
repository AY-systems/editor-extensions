# ExtensionNodeTag

Tiptap のノード名ラベルを表示する拡張機能です。初期状態では表示されます。

## Installation

```bash
npm install @aysys/extension-node-tag
```

## コマンド

```ts
editor.commands.showNodeTag(); // 表示
editor.commands.hideNodeTag(); // 非表示
editor.commands.toggleNodeTag(); // 表示状態を切替
```

表示状態はエディタごとに管理され、エディタを破棄すると初期状態（表示）に戻ります。
