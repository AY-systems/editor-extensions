import { mergeAttributes, Node } from "@tiptap/core";

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
        ({ chain, tr }) => {
          return chain()
            .insertContentAt(tr.selection.$anchor.pos, {
              type: this.name,
              attrs: attrs,
            })
            .run();
        },
      updateSource:
        (attrs) =>
        ({ chain }) => {
          // TODO:無駄な操作をなくす
          return chain()
            .selectParentNode()
            .selectNodeForward()
            .updateAttributes(this.name, attrs)
            .run();
        },
    };
  },
});
