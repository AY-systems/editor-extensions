import { Extension, mergeAttributes, Node } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
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
  atom: true,
  isolating: true,

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
        ({ editor, tr }) => {
          const { selection } = tr;
          const image = selection instanceof NodeSelection ? selection.node : null;
          if (!image || image.type.name !== "inline-image") return false;

          const $from = selection.$from;
          const parent = $from.parent;
          const offset = selection.from - $from.start();
          const before = parent.content.cut(0, offset);
          const after = parent.content.cut(offset + image.nodeSize);
          const picture = editor.schema.nodes[this.name].create(null, image);
          const beforeNode = before.size ? parent.type.create(parent.attrs, before) : null;
          const nodes = [
            ...(beforeNode ? [beforeNode] : []),
            picture,
            ...(after.size ? [parent.type.create(parent.attrs, after)] : []),
          ];

          const picturePos = $from.before() + (beforeNode?.nodeSize ?? 0);
          tr.replaceWith($from.before(), $from.after(), Fragment.fromArray(nodes));
          tr.setSelection(NodeSelection.create(tr.doc, picturePos));
          return true;
        },
      pictureToImage:
        () =>
        ({ editor, chain }) => {
          if (!editor.isActive("picture")) return false;
          return chain().setNode("paragraph").run();
        },
    };
  },
});

export const PictureKit = Extension.create({
  name: "pictureKit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== "Backspace" && event.key !== "Delete") return false;

            const { state } = view;
            const { selection } = state;
            if (!(selection instanceof NodeSelection)) return false;

            if (selection.node.type.name === "picture") {
              view.dispatch(state.tr.deleteSelection());
              return true;
            }

            if (selection.node.type.name !== "inline-image") return false;

            let pictureDepth = -1;
            for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
              if (selection.$from.node(depth).type.name === "picture") {
                pictureDepth = depth;
                break;
              }
            }

            if (pictureDepth < 0) return false;

            view.dispatch(
              state.tr.delete(
                selection.$from.before(pictureDepth),
                selection.$from.after(pictureDepth),
              ),
            );
            return true;
          },
        },
      }),
    ];
  },

  addExtensions() {
    return [Picture, InlineImage, Source];
  },
});
