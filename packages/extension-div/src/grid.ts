import { mergeAttributes } from "@tiptap/core";
import { Div } from "./div";
import { getStyle, renderStyleAttribute } from "./utils";

type GridOptions = {
  HTMLAttributes: Record<string, any>;
  style: Record<string, any>;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    grid: {
      createGrid: (cols?: number, gap?: string, responsive?: boolean) => ReturnType;
      updateGrid: (cols?: number, gap?: string, responsive?: boolean) => ReturnType;
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
      mergeAttributes(this.options.HTMLAttributes, this.options.style, HTMLAttributes, {
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
      cols: {
        default: 2,
        parseHTML: (element) => {
          const value = element.getAttribute("cols");
          if (value === null) return null;

          const cols = Number(value);
          return Number.isInteger(cols) && cols > 0 ? cols : null;
        },
        renderHTML: ({ cols, gap, responsive }) => {
          if (!cols) return;

          if (responsive && typeof cols === "number") {
            const gaps = Array.from({ length: cols - 1 }, () => gap || "0px");
            const availableWidth = ["100%", ...gaps.map((value) => `- ${value}`)].join(" ");
            return {
              cols,
              ...renderStyleAttribute(
                "grid-template-columns",
                `repeat(auto-fit, minmax(min(100%, max(200px, calc((${availableWidth}) / ${cols}))), 1fr))`,
              ),
            };
          }
          const columns = typeof cols === "number" ? `repeat(${cols}, 1fr)` : cols;
          return {
            cols,
            ...renderStyleAttribute("grid-template-columns", columns),
          };
        },
      },
      gap: {
        default: "",
        parseHTML: (element) => getStyle(element, "gap", "gap"),
        renderHTML: ({ gap }) => renderStyleAttribute("gap", gap),
      },
      responsive: {
        default: false,
        parseHTML: (element) => element.getAttribute("responsive"),
        renderHTML: ({ responsive }) => {
          if (responsive) return { responsive: true };
        },
      },
    };
  },

  addCommands() {
    return {
      createGrid:
        (cols?: number, gap?: string, responsive?: boolean) =>
        ({ chain }) => {
          const param = {
            cols: cols,
            gap: gap,
            responsive,
          };
          return chain().wrapIn(this.name, param).run();
        },
      updateGrid:
        (cols?: number, gap?: string, responsive?: boolean) =>
        ({ chain }) => {
          const param: Record<string, unknown> = {};

          if (cols !== undefined) param.cols = cols;
          if (gap !== undefined) param.gap = gap;
          if (responsive !== undefined) param.responsive = responsive;

          return chain().updateAttributes(this.name, param).run();
        },
    };
  },
});
