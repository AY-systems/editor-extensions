import { TableView } from "@tiptap/extension-table";
import type { Node } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

const TABLE_STYLE_ATTRIBUTES: Record<string, string> = {
  borderWidth: "border-width",
  borderStyle: "border-style",
  borderColor: "border-color",
  backgroundColor: "background-color",
};

const TABLE_DIMENSION_ATTRIBUTES = ["width", "height"] as const;

export class StyledTableView extends TableView {
  constructor(
    node: Node,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes?: Record<string, unknown>,
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);
    this.syncTableAttributes(node);
  }

  update(node: Node) {
    const previousNode = this.node;
    if (!super.update(node)) return false;

    this.syncTableAttributes(node, previousNode);
    return true;
  }

  private syncTableAttributes(node: Node, previousNode?: Node) {
    for (const [attribute, property] of Object.entries(TABLE_STYLE_ATTRIBUTES)) {
      const value = node.attrs[attribute];
      if (previousNode && value === previousNode.attrs[attribute]) continue;

      if (typeof value === "string" && value) {
        this.table.style.setProperty(property, value);
      } else if (previousNode) {
        this.table.style.removeProperty(property);
      }
    }

    for (const attribute of TABLE_DIMENSION_ATTRIBUTES) {
      const value = node.attrs[attribute];
      if (previousNode && value === previousNode.attrs[attribute]) continue;

      if (typeof value === "string" && value) {
        this.table.setAttribute(attribute, value);
      } else if (previousNode) {
        this.table.removeAttribute(attribute);
      }
    }
  }
}
