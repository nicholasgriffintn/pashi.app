import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { mcpViews } from "./scripts/mcp-views-plugin";

export default defineConfig({
	plugins: [react(), mcpViews(), cloudflare()],
	server: { port: 5180, strictPort: true },
});
