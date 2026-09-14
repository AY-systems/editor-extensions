import { mergeAttributes, Node } from "@tiptap/core";

export interface DivOptions {
  HTMLAttributes: Record<string, any>;
  style: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    div: {
      /**
       * 選択中のnodeをdivで囲む
       */
      wrapDiv: () => ReturnType;
      /**
       * 選択中のnodeをdiv要素に切り替えする
       */
      toggleDiv: () => ReturnType;
    };
  }
}

export const Div = Node.create<DivOptions>({
  name: "div",
  group: "block",
  content: "block*",
  selectable: true,

  // ネストしたDivのそれぞれに焦点を当てるのに必要
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      style: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: Object.entries(this.options.style)
          .map(([key, value]) => `${key}: ${value}`)
          .join("; "),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleDiv:
        () =>
        ({ editor, chain }) => {
          if (editor.isActive(this.name)) {
            return chain().lift(this.name).run();
          }

          return chain().wrapIn(this.name).run();
        },

      wrapDiv:
        () =>
        ({ chain }) => {
          return chain().wrapIn(this.name).run();
        },
    };
  },
});
