import { describe, expect, it } from "vite-plus/test";
import { ClassName } from "./classname";
import { TextDecoration } from "./text-decoration";
import { createEditor, destroyEditor } from "../../../tests/helpers";

describe("TextDecoration", () => {
  it("マークをHTMLとして入出力できる", () => {
    const { editor } = createEditor(
      [ClassName, TextDecoration],
      '<p><span data-type="textDecoration" class="underline">テスト</span></p>',
    );

    expect(editor.getHTML()).toBe(
      '<p><span class="underline" data-type="textDecoration">テスト</span></p>',
    );
    expect(editor.getAttributes("textDecoration").className).toBe("underline");
    destroyEditor(editor);
  });

  it("クラスを追加し、同じクラスを解除できる", () => {
    const { editor } = createEditor([ClassName, TextDecoration]);
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.setTextDecoration("underline")).toBe(true);
    expect(editor.getHTML()).toContain('class="underline"');
    destroyEditor(editor);
  });

  it("unset でクラスを解除できる", () => {
    const { editor } = createEditor(
      [ClassName, TextDecoration],
      '<p><span data-type="textDecoration" class="underline">テスト</span></p>',
    );
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.unsetTextDecoration("underline")).toBe(true);
    expect(editor.getHTML()).not.toContain('data-type="textDecoration"');
    destroyEditor(editor);
  });

  it("既存の複数クラスから指定したクラスだけを解除できる", () => {
    const { editor } = createEditor(
      [ClassName, TextDecoration],
      '<p><span data-type="textDecoration" class="underline bold">テスト</span></p>',
    );
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.unsetTextDecoration("underline")).toBe(true);
    expect(editor.getHTML()).toContain('class="bold"');
    expect(editor.getHTML()).not.toContain("underline");
    destroyEditor(editor);
  });

  it("選択範囲またはカーソル位置で active 状態を判定できる", () => {
    const { editor } = createEditor(
      [ClassName, TextDecoration],
      '<p><span data-type="textDecoration" class="underline">テスト</span>通常</p>',
    );

    editor.commands.setTextSelection({ from: 1, to: 4 });
    expect(editor.commands.isTextDecorationActive("underline")).toBe(true);
    editor.commands.setTextSelection(6);
    expect(editor.commands.isTextDecorationActive("underline")).toBe(false);
    destroyEditor(editor);
  });

  it("toggle でクラスを追加・解除できる", () => {
    const { editor } = createEditor([ClassName, TextDecoration]);
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.toggleTextDecoration("underline")).toBe(true);
    expect(editor.getHTML()).toContain('class="underline"');
    expect(editor.commands.toggleTextDecoration("underline")).toBe(true);
    expect(editor.getHTML()).not.toContain('data-type="textDecoration"');
    destroyEditor(editor);
  });
});
