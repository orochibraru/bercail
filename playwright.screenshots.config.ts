import { defineConfig, devices } from "@playwright/test";

// Manual only: `bun run screenshots` regenerates docs/images/. Nothing in CI or the hooks runs it.
const APP_PORT = 4998;

export default defineConfig({
	testDir: "./tests/screenshots",
	testMatch: "*.screens.ts",
	reporter: "list",
	workers: 1,
	timeout: 120_000,
	use: {
		...devices["Desktop Chrome"],
		baseURL: `http://localhost:${APP_PORT}`,
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	},
	webServer: [
		{
			command: "bun tests/screenshots/fake-homelab.ts",
			port: 4999,
		},
		{
			// A fresh instance every run: the database is wiped before the server starts.
			command:
				"rm -rf data/screenshots && bun --bun run build && ./build/server",
			port: APP_PORT,
			reuseExistingServer: false,
			timeout: 180_000,
			env: {
				PORT: String(APP_PORT),
				ORIGIN: `http://localhost:${APP_PORT}`,
				DB_FILE_NAME: "data/screenshots/db.sqlite",
				WEATHER_LAT: "48.8566",
				WEATHER_LON: "2.3522",
				WEATHER_LOCATION_NAME: "Paris",
				// Sign-in would stop the flow at the provider's page.
				OIDC_ISSUER: "",
			},
		},
	],
});
