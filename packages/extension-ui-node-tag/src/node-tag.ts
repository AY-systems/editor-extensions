import { Decoration, Extension } from "@tiptap/core";

export interface NodeTagOptions {
  ignoreNodeTypes: string[];
}

const nodeTagStyle = `
[data-node-tag] {
  border: 1px dashed #aaa;
  position: relative;
}

[data-node-tag]::before {
  content: attr(data-node-tag);
  position: absolute;
  z-index: 1;
  top: -0.5rem;
  left: 0.1rem;
  font-size: 0.6rem;
  line-height: 0.8rem;
  color: #888;
  font-weight:normal;
  background: rgba(255, 255, 255);
}
`;

export const NodeTag = Extension.create<NodeTagOptions>({
  name: "extension-node-tag",
  addStorage() {
    return { style: undefined as HTMLStyleElement | undefined };
  },
  onCreate() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = nodeTagStyle;
    document.head.appendChild(style);
    this.storage.style = style;
  },
  onDestroy() {
    this.storage.style?.remove();
  },
  addOptions() {
    return {
      ignoreNodeTypes: ["tableRow", "source"],
    };
  },
  addDecorations() {
    return {
      create: ({ state }) => {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.isText) return;
          if (this.options.ignoreNodeTypes.includes(node.type.name)) return;
          let name = node.type.name;

          // headingタグはlevelを表示
          if (node.type.name === "heading") {
            name = `h${node.attrs.level}`;
          }

          if (node.type.name === "listItem") {
            name = "li";
          }
          if (node.type.name === "tableHeader") {
            name = "th";
          }

          if (node.type.name === "tableCell") {
            name = "td";
          }

          decorations.push(
            Decoration.Node(pos, pos + node.nodeSize, {
              "data-node-tag": name,
            }),
          );
        });
        return decorations;
      },
    };
  },
});
