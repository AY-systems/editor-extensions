# ExtensionPicture

Tiptap にインライン画像、ブロック画像、レスポンシブ画像を追加します。画像機能は `@tiptap/extension-image` を利用します。

## Installation

```bash
npm install @aysys/extension-picture @tiptap/extension-image
```

## 使い方

```ts
import { PictureKit } from "@aysys/extension-picture";

const extensions = [PictureKit];
editor.commands.setInlineImage({ src: "https://example.com/image.png", alt: "説明" });
editor.commands.setBlockImage({ src: "https://example.com/image.png", alt: "説明" });
```

`PictureKit` は `Picture`、`InlineImage`、`Source` をまとめて登録します。画像を選択して `imageToPicture()` を実行するとレスポンシブ画像へ変換できます。
