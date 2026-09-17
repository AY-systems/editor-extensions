import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { Source } from "./source";
import { InlineImage } from "./image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    picture: {
      /**
       * インライン画像をレスポンシブ画像にする
       */
      imageToPicture: () => ReturnType;
      /**
       * レスポンシブ画像を破棄してインライン画像に戻す
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
          const { selection } = editor.state;
          const image = selection instanceof NodeSelection ? selection.node : null;
          if (!image || image.type.name !== "inline-image") return false;

          const $from = selection.$from;
          const parent = $from.parent;
          const offset = selection.from - $from.start();
          const before = parent.content.cut(0, offset);
          const after = parent.content.cut(offset + image.nodeSize);
          const picture = editor.schema.nodes[this.name].create(null, image);
          const nodes = [
            ...(before.size ? [parent.type.create(parent.attrs, before)] : []),
            picture,
            ...(after.size ? [parent.type.create(parent.attrs, after)] : []),
          ];

          return chain()
            .command(({ tr }) => {
              tr.replaceWith($from.before(), $from.after(), Fragment.fromArray(nodes));
              return true;
            })
            .run();
        },
      pictureToImage:
        () =>
        ({ editor, chain }) => {
          if (editor.isActive("picture")) {
            return chain().setNode("paragraph").run();
          }

          return true;
        },
    };
  },
});

export const PictureKit = Extension.create({
  name: "pictureKit",

  addExtensions() {
    return [Picture, InlineImage, Source];
  },
});
