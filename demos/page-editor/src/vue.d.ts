// vp check の TypeScript 検査で Vue SFC をモジュールとして認識させるための宣言。
declare module "*.vue" {
  import type { Component } from "vue";

  const component: Component;
  export default component;
}
