import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    source: {
      /**
       * レスポンシブサイズを設定する
       * @param attrs {media:string; srcset:string}
       */
      setSource: (attrs: { media: string; srcset: string }) => ReturnType;
      /**
       * レスポンシブサイズを更新する
       * @param attrs {media:string; srcset:string}
       */
      updateSource: (attrs: { media: string; srcset: string }) => ReturnType;
    };
  }
}

export interface SourceOptions {
  HTMLAttributes: Record<string, any>;
}

// 画像レスポンシブ設定　サイズ指定
export const Source = Node.create<SourceOptions>({
  name: "source",
  group: "source",
  inline: true,
  parseHTML() {
    return [{ tag: `source` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["source", mergeAttributes(HTMLAttributes, { "data-type": this.name })];
  },

  addAttributes() {
    return {
      srcset: {
        default: "",
        parseHTML: (element) => element.getAttribute("srcset"),
        renderHTML: (attributes) => {
          if (!attributes.srcset) return;
          return {
            srcset: `${attributes.srcset}`,
          };
        },
      },

      media: {
        default: "",
        parseHTML: (element) => element.getAttribute("media"),
        renderHTML: (attributes) => {
          if (!attributes.media) return;
          return {
            media: `${attributes.media}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      setSource:
        (attrs) =>
        ({ editor, tr }) => {
          if (!editor.isActive("picture")) return false;

          const selection = tr.selection;
          if (selection instanceof NodeSelection) {
            if (selection.node.type.name !== "picture") return false;

            tr.insert(selection.from + 1, editor.schema.nodes[this.name].create(attrs));
            return true;
          }

          let pictureDepth = -1;
          for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
            if (selection.$from.node(depth).type.name === "picture") {
              pictureDepth = depth;
              break;
            }
          }

          if (pictureDepth < 0) return false;

          tr.insert(
            selection.$from.start(pictureDepth),
            editor.schema.nodes[this.name].create(attrs),
          );
          return true;
        },
      updateSource:
        (attrs) =>
        ({ editor, chain }) =>
          chain()
            .command(({ tr }) => {
              const { selection } = editor.state;
              if (!editor.isActive("picture") || !(selection instanceof NodeSelection)) {
                return false;
              }

              let sourcePos = selection.from + 1;
              let updated = false;
              selection.node.forEach((child) => {
                if (child.type.name === this.name) {
                  tr.setNodeMarkup(sourcePos, undefined, { ...child.attrs, ...attrs });
                  updated = true;
                }
                sourcePos += child.nodeSize;
              });

              return updated;
            })
            .run(),
    };
  },
});
