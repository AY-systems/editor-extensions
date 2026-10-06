# ExtensionEmbedMedia

Tiptap に iframe による外部メディア埋め込みを追加します。埋め込み元 URL は HTTP または HTTPS を使用してください。

## 使い方

```bash
import { EmbedMedia } from "@aysys/extension-embed-media";

const extensions = [EmbedMedia];
editor.commands.insertIFrame({
  src: "https://example.com/embed/video",
  width: "560",
  height: "315",
  aspectRatio: "16 / 9",
  maxWidth: "100%",
});
```

`updateIFrame` コマンドで選択中の埋め込みを更新できます。
