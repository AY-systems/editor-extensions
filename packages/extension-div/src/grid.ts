import { mergeAttributes } from "@tiptap/core";
import { Div } from "./div";

type GridOptions = {
  HTMLAttributes: Record<string, any>;
  style: Record<string, any>;
};

const getStyle = (element: HTMLElement, property: string, attribute: string) =>
  element.style.getPropertyValue(property) || element.getAttribute(attribute) || "";

const renderStyleAttribute = (property: string, value: string) => {
  if (!value) return;

  return {
    style: `${property}: ${value}`,
  };
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    grid: {
      createGrid: (cols?: number, gap?: string, isResponsive?: boolean) => ReturnType;
      updateGrid: (cols?: number, gap?: string, isResponsive?: boolean) => ReturnType;
    };
  }
}

export const Grid = Div.extend<GridOptions>({
  name: "grid",
  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]`, priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
      }),
      0,
    ];
  },
  addAttributes() {
    return {
      display: {
        default: "grid",
        parseHTML: (element) => getStyle(element, "display", "display"),
        renderHTML: ({ display }) => renderStyleAttribute("display", display),
      },
      gridCols: {
        default: "",
        parseHTML: (element) => getStyle(element, "grid-template-columns", "gridCols"),
        renderHTML: ({ gridCols }) => {
          if (!gridCols) return;
          const columns = typeof gridCols === "number" ? `repeat(${gridCols}, 1fr)` : gridCols;
          return renderStyleAttribute("grid-template-columns", columns);
        },
      },
      gap: {
        default: "",
        parseHTML: (element) => getStyle(element, "gap", "gap"),
        renderHTML: ({ gap }) => renderStyleAttribute("gap", gap),
      },
      isResponsive: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("isResponsive") || element.classList.contains("grid-responsive"),
        renderHTML: ({ isResponsive }) => {
          if (!isResponsive) return;
          return { class: "grid-responsive" };
        },
      },
    };
  },

  addCommands() {
    return {
      createGrid:
        (cols?: number, gap?: string, isResponsive?: boolean) =>
        ({ commands }) => {
          const param = {
            display: "grid",
            gridCols: cols ?? 2,
            gap: gap ?? "",
            isResponsive,
          };
          return commands.wrapIn(this.name, param);
        },
      updateGrid:
        (cols?: number, gap?: string, isResponsive?: boolean) =>
        ({ commands }) => {
          const param = {
            isResponsive,
            gridCols: cols ?? 2,
            gap: gap ?? "",
          };
          return commands.updateAttributes(this.name, param);
        },
    };
  },
});
