import { mergeAttributes } from "@tiptap/core";
import { Div, type DivOptions } from "./div";
import { getStyle, renderStyleAttribute } from "./utils";

const validateColumns = (value: number, maxColumns: number): number | null =>
  Number.isInteger(value) && value > 0 ? Math.min(value, maxColumns) : null;

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
        parseHTML: (element) => {
          const value = element.getAttribute("cols");
          if (value === null) return null;

          const cols = Number(value);
          return validateColumns(cols, this.options.maxColumns);
        },
        renderHTML: ({ cols, gap, responsive }) => {
          const safeCols =
            typeof cols === "number" ? validateColumns(cols, this.options.maxColumns) : null;
          if (!safeCols) return;

          if (responsive) {
            const gaps = Array.from({ length: safeCols - 1 }, () => gap || "0px");
            const availableWidth = ["100%", ...gaps.map((value) => `- ${value}`)].join(" ");
            return {
              cols: safeCols,
              ...renderStyleAttribute(
                "grid-template-columns",
                `repeat(auto-fit, minmax(min(100%, max(200px, calc((${availableWidth}) / ${safeCols}))), 1fr))`,
              ),
            };
          }
          const columns = `repeat(${safeCols}, 1fr)`;
          return {
            cols: safeCols,
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
          const param = {
            cols: cols === undefined ? undefined : validateColumns(cols, this.options.maxColumns),
            gap: gap,
            responsive,
          };
          return chain().wrapIn(this.name, param).run();
        },
      updateGrid:
        (cols, gap, responsive) =>
        ({ chain }) => {
          const param: Record<string, unknown> = {};

          if (cols !== undefined) param.cols = validateColumns(cols, this.options.maxColumns);
          if (gap !== undefined) param.gap = gap;
          if (responsive !== undefined) param.responsive = responsive;

          return chain().updateAttributes(this.name, param).run();
        },
    };
  },
});
