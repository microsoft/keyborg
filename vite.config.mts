import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: {
    "process.env.PKG_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [react()],
});
