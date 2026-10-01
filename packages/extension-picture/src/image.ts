import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

type ImageAttributes = Record<string, unknown>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineImage: {
      setInlineImage: (attrs: ImageAttributes) => ReturnType;
    };
    blockImage: {
      setBlockImage: (attrs: ImageAttributes) => ReturnType;
    };
  }
}

const BaseImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { "data-type": this.name })];
  },
});

export const BlockImage = BaseImage.extend({
  name: "blockImage",
  inline: false,
  group: "block",

  parseHTML() {
    return [{ tag: 'img[data-type="blockImage"]' }];
  },

  addCommands() {
    return {
      setBlockImage:
        (attrs: ImageAttributes) =>
        ({ chain, state, tr }) => {
          return chain()
            .insertContent({ type: this.name, attrs })
            .setNodeSelection(tr.mapping.map(state.selection.from))
            .run();
        },
    };
  },
});

export const InlineImage = BaseImage.extend({
  name: "inlineImage",
  inline: true,
  group: "inline",

  parseHTML() {
    return [{ tag: 'img[data-type="inlineImage"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-type": this.name,
        style: "display: inline",
      }),
    ];
  },

  addCommands() {
    return {
      setInlineImage:
        (attrs: ImageAttributes) =>
        ({ chain, state }) => {
          const position = state.selection.from;
          return chain().insertContent({ type: this.name, attrs }).setNodeSelection(position).run();
        },
    };
  },
});
