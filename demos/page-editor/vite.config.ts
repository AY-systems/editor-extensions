import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

const packagesPath = fileURLToPath(new URL("../../packages", import.meta.url));
const packageAliases = Object.fromEntries(
  readdirSync(packagesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("extension-"))
    .map((entry) => {
      const packagePath = resolve(packagesPath, entry.name);
      const { name } = JSON.parse(readFileSync(resolve(packagePath, "package.json"), "utf8"));
      return [name, resolve(packagePath, "src")];
    }),
);

export default defineConfig({
  resolve: {
    alias: packageAliases,
  },
  plugins: [vue(), tailwindcss()],
});
