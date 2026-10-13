import { TableView } from "@tiptap/extension-table";
import type { Node } from "@tiptap/pm/model";

export class StyledTableView extends TableView {
  update(node: Node) {
    const previousNode = this.node;
    if (!super.update(node)) return false;

    this.updateTableAttributes(node, previousNode);
    return true;
  }

  private updateTableAttributes(node: Node, previousNode: Node) {
    const styleAttributes: Record<string, string> = {
      borderWidth: "border-width",
      borderStyle: "border-style",
      borderColor: "border-color",
      backgroundColor: "background-color",
    };

    for (const [attribute, property] of Object.entries(styleAttributes)) {
      if (node.attrs[attribute] === previousNode.attrs[attribute]) continue;

      const value = node.attrs[attribute];
      this.table.style.setProperty(property, typeof value === "string" ? value : "");
    }

    for (const attribute of ["width", "height"] as const) {
      if (node.attrs[attribute] === previousNode.attrs[attribute]) continue;

      const value = node.attrs[attribute];
      if (typeof value === "string" && value) {
        this.table.setAttribute(attribute, value);
      } else {
        this.table.removeAttribute(attribute);
      }
    }
  }
}
