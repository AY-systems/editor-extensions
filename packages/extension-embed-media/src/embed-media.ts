import { mergeAttributes, Node } from "@tiptap/core";

// iframeの設定パラメータの型
export type EmbedMediaProps = {
  src: string;
  width: string;
  height: string;
  aspectRatio: string;
  maxWidth: string;
};

export interface EmbedMediaOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embedMedia: {
      insertIFrame: (attrs: EmbedMediaProps) => ReturnType;
      updateIFrame: (attrs: EmbedMediaProps) => ReturnType;
    };
  }
}

export const EmbedMedia = Node.create<EmbedMediaOptions>({
  name: "embedMedia",
  group: "inline",
  inline: true,

  addExtensions() {
    return [IframeWrapper];
  },

  parseHTML() {
    return [
      {
        tag: `iframe`,
      },
      {
        tag: `iframe[data-type="iframe"]`,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(this.options.HTMLAttributes, { "data-type": "iframe" }, HTMLAttributes),
    ];
  },

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => {
          if (!attributes.src) return;
          return {
            src: attributes.src,
          };
        },
      },
      width: {
        default: "",
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          if (!attributes.width) return;
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: "",
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => {
          if (!attributes.height) return;
          return {
            height: attributes.height,
          };
        },
      },
      aspectRatio: {
        default: "",
        parseHTML: (element) => element.style.aspectRatio,
        renderHTML: (attributes) => {
          if (!attributes.aspectRatio) return;
          return {
            style: `aspect-ratio:${attributes.aspectRatio};`,
          };
        },
      },
      maxWidth: {
        default: "",
        parseHTML: (element) => element.style.maxWidth,
        renderHTML: (attributes) => {
          if (!attributes.maxWidth) return;
          return {
            style: `max-width:${attributes.maxWidth};`,
          };
        },
      },
      loading: {
        default: "lazy",
        parseHTML: (element) => element.getAttribute("loading"),
        renderHTML: (attributes) => {
          if (!attributes.loading) return;
          return {
            loading: attributes.loading,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      // IFrameの挿入
      insertIFrame:
        (attrs: EmbedMediaProps) =>
        ({ chain }) => {
          return (
            chain()
              // 目印にクラスをつける
              .updateAttributes("paragraph", { class: "iframe_wrapper" })
              // iframeを挿入
              .command(({ tr, dispatch, chain }) => {
                if (dispatch) {
                  const { $from } = tr.selection;
                  chain().insertContentAt($from.pos, {
                    type: "iframe-wrapper",
                    content: [{ type: this.name, attrs }],
                  });
                }
                return true;
              })
              .run()
          );
        },
      // IFrameのプロパティ更新
      updateIFrame:
        (attrs: EmbedMediaProps) =>
        ({ chain }) => {
          return chain()
            .updateAttributes("embedMedia", { ...attrs })
            .run();
        },
    };
  },
});

const IframeWrapper = Node.create({
  name: "iframe-wrapper",
  group: "block",
  content: "embedMedia",

  parseHTML() {
    return [
      {
        tag: "*",
        priority: 100,
        getAttrs: (element) => {
          const firstChild = element.firstElementChild;
          const isIframeWrapper =
            element.children.length === 1 &&
            firstChild?.tagName.toLowerCase() === "iframe" &&
            element.textContent?.trim() === "";

          return isIframeWrapper ? null : false;
        },
      },
      {
        tag: `[data-type="iframe-wrapper"]`,
        priority: 100,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { "data-type": "iframe-wrapper" }), 0];
  },
});
