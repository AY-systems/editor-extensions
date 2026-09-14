import type { Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";

export interface AnchorLinkOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    anchorLink: {
      setAnchorLink: (name: string) => ReturnType;
      unsetAnchorLink: () => ReturnType;
    };
  }
}

const ANCHOR_LINK_STYLES = `
*[data-type="anchor_link"] {
  position: relative;
}
*[data-type="anchor_link"]::after {
  position: absolute;
  transform: translate(50%, -50%);
  top: 0;
  right: 0;
  content: "";
  width: 1rem;
  height: 1rem;
  background-image: url(https://api.iconify.design/mdi:link-box-variant.svg?color=%23888888);
  background-repeat: no-repeat;
  user-select: none;
  pointer-events: none;
}
`;

// 有効な対象のノード名を取得
function getActiveNodeType(editor: Editor, types: string[]) {
  let node_type = "";
  types.some((type) => {
    if (editor.isActive(type)) {
      node_type = type;
      return true;
    }
    return false;
  });

  return node_type;
}

export const AnchorLink = Extension.create<AnchorLinkOptions>({
  name: "anchorLink",
  addOptions() {
    return {
      // 対象のノード
      types: ["heading", "paragraph"],
    };
  },
  addStorage() {
    return { style: undefined as HTMLStyleElement | undefined };
  },
  onCreate() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = ANCHOR_LINK_STYLES;
    document.head.appendChild(style);
    this.storage.style = style;
  },
  onDestroy() {
    this.storage.style?.remove();
  },
  // attributesの追加
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          anchorLink: {
            default: "",
            parseHTML: (element) => element.getAttribute("id") ?? "",
            renderHTML: (attributes) => {
              if (attributes.anchorLink === "") {
                return {};
              }
              return {
                id: `${attributes.anchorLink}`,
                "data-type": "anchor_link",
              };
            },
          },
        },
      },
    ];
  },
  // コマンドの追加
  addCommands() {
    return {
      // アンカーidを付ける
      setAnchorLink:
        (name: string) =>
        ({ editor, chain }) => {
          const node_type = getActiveNodeType(editor, this.options.types);

          // 有効なnodeがない場合何もしない
          if (!node_type) return false;

          return chain()
            .focus()
            .updateAttributes(node_type, {
              anchorLink: name,
            })
            .run();
        },

      // アンカーの解除
      unsetAnchorLink:
        () =>
        ({ editor, chain }) => {
          const node_type = getActiveNodeType(editor, this.options.types);

          // 有効なnodeがない場合何もしない
          if (!node_type) return false;

          return chain()
            .focus()
            .updateAttributes(node_type, {
              anchorLink: "",
            })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // アンカー内でのEnterでの改行はattributeを引き継がない
      Enter: ({ editor }) => {
        const node_type = getActiveNodeType(editor, this.options.types);

        // 有効なnodeがない場合何もしない
        if (!node_type) return false;

        // 改行後 改行先のアンカーリンク解除
        return this.editor.chain().focus().splitBlock().unsetAnchorLink().run();
      },
    };
  },
});
