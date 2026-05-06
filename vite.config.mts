import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "process.env.PKG_VERSION": JSON.stringify("local"),
  },
  plugins: [react()],
});
