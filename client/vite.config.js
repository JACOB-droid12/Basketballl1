import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = path.resolve(clientRoot, "..");

export default defineConfig({
  root: clientRoot,
  base: "/app/",
  plugins: [react()],
  build: {
    outDir: path.join(projectRoot, "public", "app"),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: path.join(clientRoot, "index.html")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
});
