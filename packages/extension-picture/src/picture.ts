import { mergeAttributes, Node } from "@tiptap/core";
import { Source } from "./source";
import { InlineImage } from "./image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    picture: {
      /**
       * imgタグをレスポンシブ画像にする
       */
      imageToPicture: () => ReturnType;
      /**
       * レスポンシブ画像を破棄してimgタグに戻す
       */
      pictureToImage: () => ReturnType;
    };
  }
}

export interface PictureOptions {
  HTMLAttributes: Record<string, any>;
}

// 画像のレスポンシブ設定時のimgラッパー
export const Picture = Node.create<PictureOptions>({
  name: "picture",
  group: "block",
  content: "(inline|source)+",

  addExtensions() {
    return [InlineImage, Source];
  },

  parseHTML() {
    return [{ tag: `picture` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["picture", mergeAttributes(HTMLAttributes, { "data-type": "picture" }), 0];
  },
  addCommands() {
    return {
      imageToPicture:
        () =>
        ({ editor, chain }) => {
          //　このノードが有効でない場合親のノードを書き換える
          if (!editor.isActive(this.name)) {
            return chain().setNode(this.name).run();
          }
          return true;
        },
      pictureToImage:
        () =>
        ({ editor, chain }) => {
          // このノードが有効な場合親のノードをparagraphに戻す
          if (editor.isActive("picture")) {
            // sourceはpicture下でしか有効でないので消滅する
            return chain().setNode("paragraph").run();
          }

          return true;
        },
    };
  },
});
