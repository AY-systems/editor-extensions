import { mergeAttributes } from "@tiptap/core";
import { Div, type DivOptions } from "./div";
import { getStyle, renderStyleAttribute } from "./utils";

type GridOptions = Partial<DivOptions> & {
  maxColumns: number;
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
  addOptions() {
    return {
      ...this.parent?.(),
      maxColumns: 12,
    };
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]`, priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes ?? {}, this.options.style ?? {}, HTMLAttributes, {
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
        parseHTML: (element) => element.getAttribute("cols"),
        renderHTML: ({ cols, gap, responsive }) => {
          if (responsive) {
            const gaps = Array.from({ length: Number(cols) - 1 }, () => gap || "0px");
            const availableWidth = ["100%", ...gaps.map((value) => `- ${value}`)].join(" ");
            return {
              cols: cols,
              ...renderStyleAttribute(
                "grid-template-columns",
                `repeat(auto-fit, minmax(min(100%, max(200px, calc((${availableWidth}) / ${cols}))), 1fr))`,
              ),
            };
          }
          const columns = `repeat(${cols}, 1fr)`;
          return {
            cols: cols,
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
        parseHTML: (element) => element.getAttribute("responsive") === "true",
        renderHTML: ({ responsive }) => {
          if (responsive) return { responsive: true };
        },
      },
    };
  },

  addCommands() {
    return {
      createGrid:
        (cols, gap, responsive) =>
        ({ chain }) => {
          cols ??= 2;
          if (!Number.isInteger(cols) || cols < 1 || this.options.maxColumns < cols) return false;
          const param = {
            cols,
            gap: gap,
            responsive,
          };
          return chain().wrapIn(this.name, param).run();
        },
      updateGrid:
        (cols, gap, responsive) =>
        ({ chain }) => {
          if (
            cols !== undefined &&
            (!Number.isInteger(cols) || cols < 1 || this.options.maxColumns < cols)
          ) {
            return false;
          }

          const param: Record<string, unknown> = {};

          if (cols !== undefined) param.cols = cols;
          if (gap !== undefined) param.gap = gap;
          if (responsive !== undefined) param.responsive = responsive;

          return chain().updateAttributes(this.name, param).run();
        },
    };
  },
});
