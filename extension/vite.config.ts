import { crx, defineManifest } from "@crxjs/vite-plugin";
import { defineConfig } from "vite";
import pkg from "../package.json" with { type: "json" };

const manifest = defineManifest({
	manifest_version: 3,
	name: "Bercail",
	version: pkg.version,
	description: "Opens your Bercail dashboard in every new tab.",
	chrome_url_overrides: { newtab: "newtab.html" },
	options_ui: { page: "options.html", open_in_tab: true },
	// Granted for the bercail origin only, so the iframe gets its auth proxy's SameSite=Lax cookie.
	optional_host_permissions: ["http://*/*", "https://*/*"],
});

export default defineConfig({
	root: import.meta.dirname,
	build: { outDir: "../dist/extension", emptyOutDir: true },
	plugins: [crx({ manifest })],
});
