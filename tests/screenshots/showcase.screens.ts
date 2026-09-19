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

	// Not in any screenshot: checks that adding a task reaches the server and shows up.
	await page.getByRole("button", { name: "Add task" }).click();
	await page.getByLabel("Task title").fill("Rotate the backup drives");
	await page.getByLabel("Due", { exact: true }).click();
	await page.getByRole("option", { name: "Custom" }).click();
	await page.getByRole("button", { name: "Due date" }).click();
	await page.locator("[data-bits-day][data-today]").click();
	await expect(page.getByRole("button", { name: "Due date" })).toBeHidden();
	await page.getByLabel("Due time").fill("23:30");
	await page.getByRole("radio", { name: "High priority" }).click();
	await page.getByLabel("List").click();
	await page.getByRole("option", { name: "Home", exact: true }).click();
	await page.getByRole("button", { name: "Add", exact: true }).click();
	await expect(page.getByText("Task added")).toBeVisible();

	await page.getByLabel("Task title").fill("Water the plants");
	await page.getByLabel("Due", { exact: true }).click();
	await page.getByRole("option", { name: /^Tomorrow at 9/ }).click();
	await page.getByRole("button", { name: "Add", exact: true }).click();
	await expect(page.getByText("Task added")).toHaveCount(2);
	await page.getByRole("button", { name: "Cancel" }).click();

	await page.getByRole("button", { name: /^and \d+ more$/ }).click();
	const allTasks = page.getByRole("dialog");
	const added = allTasks
		.getByRole("listitem")
		.filter({ hasText: "Rotate the backup drives" });
	await expect(added).toContainText("Home");
	await expect(added).toContainText("Today 11:30 PM");
	await expect(added.locator(".border-red-500")).toHaveCount(1);
	await expect(
		allTasks.getByRole("listitem").filter({ hasText: "Water the plants" }),
	).toContainText("Tomorrow 9:00 AM");
	await expect(allTasks.getByRole("listitem")).toHaveCount(11);
	await page.keyboard.press("Escape");
	await expect(allTasks).toBeHidden();

	await page
		.getByRole("button", { name: "Edit Water the plants", exact: true })
		.click();
	await expect(page.getByLabel("Task title")).toHaveValue("Water the plants");
	await expect(page.getByLabel("Due time")).toHaveValue("09:00");
	await page.getByLabel("Task title").fill("Water the balcony plants");
	await page.getByRole("radio", { name: "Medium priority" }).click();
	await page.getByRole("button", { name: "Save", exact: true }).click();
	await expect(page.getByText("Task saved")).toBeVisible();
	const edited = page
		.getByRole("listitem")
		.filter({ hasText: "Water the balcony plants" });
	await expect(edited).toContainText("Tomorrow 9:00 AM");
	await expect(edited.locator(".border-amber-500")).toHaveCount(1);

	await page
		.getByRole("button", { name: "Delete Renew the domain", exact: true })
		.click();
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page.getByText('"Renew the domain" deleted')).toBeVisible();
	await expect(page.getByText("Renew the domain")).toHaveCount(0);

	await page.getByRole("button", { name: "Refresh tasks" }).click();
	await expect(
		page.getByRole("button", { name: "Refresh tasks" }),
	).toBeEnabled();
	await expect(page.getByText("Failed to refresh")).toHaveCount(0);
	await page.reload();
	await page.waitForLoadState("networkidle");

	await page.keyboard.press("ControlOrMeta+k");
	await page.getByPlaceholder("Type a command or search...").fill("ra");
	await shoot(page, "search");
});
