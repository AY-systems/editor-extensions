import { PackUserConfig } from "vite-plus/pack";
export const basePackConfig = (): PackUserConfig => ({
  tsconfig: "../../tsconfig.build.json",
  dts: true,
  format: ["esm", "cjs"],
  sourcemap: true,
});
