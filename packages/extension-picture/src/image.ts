import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

type ImageAttributes = Record<string, unknown>;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    "inline-image": {
      setInlineImage: (attrs: ImageAttributes) => ReturnType;
    };
    "block-image": {
      setBlockImage: (attrs: ImageAttributes) => ReturnType;
    };
  }
}

const BaseImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      //   alt: {
      //     default: null,
      //     parseHTML: (element: HTMLElement) => element.getAttribute("alt"),
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.alt) return;
      //       return {
      //         alt: attributes.alt,
      //         title: attributes.title,
      //       };
      //     },
      //   },
      //   title: {
      //     default: null,
      //     renderHTML: (attributes: any) => {
      //       return {
      //         title: attributes.alt,
      //       };
      //     },
      //   },

      //   // 画像の右・左回り込みを変更可能に
      //   float: {
      //     default: null,
      //     parseHTML: (element: HTMLElement) => element.style?.float || "",
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.float) return;
      //       return {
      //         style: `float: ${attributes.float}`,
      //       };
      //     },
      //   },
      //   // 画像の横幅style
      //   ImgWidth: {
      //     default: "100%",
      //     parseHTML: (element: HTMLElement) =>
      //       element.getAttribute("ImgWidth") || element.style.width,
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.ImgWidth) return;
      //       return {
      //         style: `width:${attributes.ImgWidth}`,
      //       };
      //     },
      //   },
      //   // 画像の高さstyle
      //   ImgHeight: {
      //     default: "auto",
      //     parseHTML: (element: HTMLElement) =>
      //       element.getAttribute("ImgHeight") || element.style.height,
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.ImgHeight) return;
      //       return {
      //         style: `height:${attributes.ImgHeight}`,
      //       };
      //     },
      //   },
      //   // 画像のwidthは元画像のwidthに固定する
      //   srcWidth: {
      //     default: "",
      //     parseHTML: (element: HTMLElement) =>
      //       element.getAttribute("srcWidth") || element.getAttribute("width"),
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.srcWidth) return;
      //       return {
      //         width: attributes.srcWidth,
      //       };
      //     },
      //   },
      //   // 画像のheightは元画像のheightに固定する
      //   srcHeight: {
      //     default: "",
      //     parseHTML: (element: HTMLElement) =>
      //       element.getAttribute("srcHeight") || element.getAttribute("height"),
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.srcHeight) return;
      //       return {
      //         height: attributes.srcHeight,
      //       };
      //     },
      //   },
      //   maxWidth: {
      //     default: "",
      //     parseHTML: (element: HTMLElement) => element.style.maxWidth,
      //     renderHTML: (attributes: any) => {
      //       if (!attributes.maxWidth) return;
      //       return {
      //         style: `max-width:${attributes.maxWidth};`,
      //       };
      //     },
      //   },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { "data-type": this.name })];
  },
});

export const BlockImage = BaseImage.extend({
  name: "block-image",
  inline: false,
  group: "block",

  parseHTML() {
    return [{ tag: 'img[data-type="block-image"]' }];
  },

  addCommands() {
    return {
      setBlockImage:
        (attrs: ImageAttributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});

export const InlineImage = BaseImage.extend({
  name: "inline-image",
  inline: true,
  group: "inline",

  parseHTML() {
    return [{ tag: 'img[data-type="inline-image"]' }, { tag: "img:not([data-type])" }];
  },

  addCommands() {
    return {
      setInlineImage:
        (attrs: ImageAttributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
