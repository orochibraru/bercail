import { expect, type Page, test } from "@playwright/test";

const HOMELAB = "http://localhost:4999";

const groups: [string, string, [string, string, string][]][] = [
	[
		"Media",
		"Movies, shows and downloads",
		[
			["Jellyfin", "Movies and TV", "jellyfin"],
			["Jellyseerr", "Requests", "jellyseerr"],
			["Sonarr", "TV shows", "sonarr"],
			["Radarr", "Movies", "radarr"],
			["Prowlarr", "Indexers", "prowlarr"],
			["qBittorrent", "Downloads", "qbittorrent"],
		],
	],
	[
		"Home",
		"Around the house",
		[
			["Home Assistant", "Automations", "home-assistant"],
			["Frigate", "Cameras", "frigate"],
			["Immich", "Photos", "immich"],
			["Paperless-ngx", "Documents", "paperless-ngx"],
			["Nextcloud", "Files", "nextcloud"],
			["Vaultwarden", "Passwords", "vaultwarden"],
		],
	],
	[
		"Infrastructure",
		"Keeping it all running",
		[
			["Proxmox", "Hypervisor", "proxmox"],
			["Portainer", "Containers", "portainer"],
			["Traefik", "Reverse proxy", "traefik"],
			["AdGuard Home", "DNS", "adguard-home"],
			["Uptime Kuma", "Monitoring", "uptime-kuma"],
			["Grafana", "Metrics", "grafana"],
			["Gitea", "Git", "gitea"],
		],
	],
];

const backup = {
	version: "1.0",
	timestamp: new Date().toISOString(),
	data: {
		groups: groups.map(([title, description, items]) => {
			const groupId = title.toLowerCase();
			return {
				id: groupId,
				title,
				description,
				items: items.map(([itemTitle, itemDescription, icon]) => ({
					id: icon,
					groupId,
					title: itemTitle,
					description: itemDescription,
					// Frigate points at a closed port, so one link shows as offline.
					url:
						icon === "frigate" ? "http://localhost:4997" : `${HOMELAB}/${icon}`,
					target: "_blank",
					icon,
				})),
			};
		}),
	},
};

async function shoot(page: Page, name: string, fullPage = false) {
	for (const colorScheme of ["light", "dark"] as const) {
		await page.emulateMedia({ colorScheme });
		await page.screenshot({
			path: `docs/images/${colorScheme === "dark" ? `${name}-dark` : name}.png`,
			fullPage,
			animations: "disabled",
		});
	}
}

test("showcase", async ({ page }) => {
	await page.goto("/settings");
	// Hydrated, or the file input has no handler yet.
	await page.waitForLoadState("networkidle");
	await page.locator('input[type="file"]').setInputFiles({
		name: "backup.json",
		mimeType: "application/json",
		buffer: Buffer.from(JSON.stringify(backup)),
	});
	await expect(page.getByText("Backup restored successfully")).toBeVisible();
	// Settings reloads itself after a restore.
	await page.waitForEvent("load");
	await page.waitForLoadState("networkidle");

	const umami = page
		.locator("form")
		.filter({ has: page.getByPlaceholder("https://umami.example.com") });
	await umami.getByPlaceholder("https://umami.example.com").fill(HOMELAB);
	await umami.locator('input[type="password"]').fill("demo");
	await umami.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Umami connected")).toBeVisible();
	await expect(page.getByText("Umami connected")).toBeHidden();

	const tasks = page
		.locator("form")
		.filter({ has: page.getByPlaceholder("https://caldav.tasks.org") });
	await tasks
		.getByPlaceholder("https://caldav.tasks.org")
		.fill(`${HOMELAB}/dav`);
	await tasks.getByLabel("Username").fill("demo");
	await tasks.locator('input[type="password"]').fill("demo");
	await tasks.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText("Tasks connected")).toBeVisible();
	await expect(page.getByText("Tasks connected")).toBeHidden();
	await shoot(page, "settings");

	await page.goto("/");
	await expect(page.getByLabel("Checking")).toHaveCount(0);
	await expect(page.getByText("Blog", { exact: true })).toBeVisible();
	await expect(page.getByText("Renew the domain")).toBeVisible();
	await expect(page.getByText("Paris")).toBeVisible();
	// Icons load lazily from a CDN.
	await page.waitForLoadState("networkidle");
	await shoot(page, "dashboard", true);

	await page.keyboard.press("ControlOrMeta+k");
	await page.getByPlaceholder("Type a command or search...").fill("ra");
	await shoot(page, "search");
});
