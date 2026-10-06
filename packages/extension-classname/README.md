# ExtensionClassName

Tiptap のノードやマークに CSS クラスを設定する拡張機能です。初期状態では `heading` と `paragraph` が対象です。

## 使い方

```ts
import { ClassName, TextDecoration } from "@aysys/extension-classname";

const extensions = [ClassName, TextDecoration];
editor.commands.setClassName("notice");
editor.commands.toggleClassName("notice");
editor.commands.unsetClassName("notice");
editor.commands.setTextDecoration("underline");
```

対象タイプは `ClassName.configure({ types: ["heading", "paragraph"] })` で指定できます。`registerClassNameType` を使った対象タイプの登録にも対応します。
