// Stands in for the homelab during `bun run screenshots`: every link's HEAD check gets a 200, and
// /api/* answers like an Umami v3 instance with made-up but plausible numbers, and /dav/* like a
// CalDAV server (tasks.org, Nextcloud) holding a few tasks due around today.
const DAY_MS = 24 * 60 * 60 * 1000;

const websites = [
	{ id: "blog", name: "Blog", domain: "blog.example.com", dailyVisitors: 180 },
	{
		id: "photos",
		name: "Photos",
		domain: "photos.example.com",
		dailyVisitors: 42,
	},
];

/** Local date `days` from today at `hour` (all-day when hour is omitted), as iCalendar wants it. */
function icsDate(days: number, hour?: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	if (hour === undefined) {
		return `;VALUE=DATE:${date.toLocaleDateString("sv").replaceAll("-", "")}`;
	}
	date.setHours(hour, 0, 0, 0);
	return `:${date.toISOString().replace(/[-:]|\.\d+/g, "")}`;
}

const lists: Record<string, [string, string | null, number][]> = {
	Homelab: [
		["Renew the domain", icsDate(-1), 1],
		["Replace the UPS battery", icsDate(0, 18), 5],
		["Test restoring a Vaultwarden backup", icsDate(1), 1],
		["Update Proxmox to the new release", icsDate(3, 20), 5],
		["Label the cables in the rack", null, 9],
	],
	Home: [
		["Take the bins out", icsDate(0, 20), 0],
		["Book the boiler service", icsDate(9), 0],
	],
};

function multistatus(responses: string[]): Response {
	return new Response(
		`<?xml version="1.0"?><multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">${responses.join("")}</multistatus>`,
		{ status: 207, headers: { "Content-Type": "application/xml" } },
	);
}

function calDav(request: Request, path: string): Response {
	if (request.method === "REPORT") {
		const name = decodeURIComponent(path.split("/")[3]);
		return multistatus(
			(lists[name] ?? []).map(([title, due, priority], index) => {
				const ics = [
					"BEGIN:VCALENDAR",
					"BEGIN:VTODO",
					`UID:${name}-${index}`,
					`SUMMARY:${title}`,
					...(due ? [`DUE${due}`] : []),
					`PRIORITY:${priority}`,
					"END:VTODO",
					"END:VCALENDAR",
				].join("\r\n");
				return `<response><href>${path}${index}.ics</href><propstat><prop><C:calendar-data>${ics}</C:calendar-data></prop></propstat></response>`;
			}),
		);
	}
	if (path === "/dav/calendars/") {
		return multistatus(
			Object.keys(lists).map(
				(name) =>
					`<response><href>/dav/calendars/${encodeURIComponent(name)}/</href><propstat><prop><resourcetype><collection/><C:calendar/></resourcetype><displayname>${name}</displayname><C:supported-calendar-component-set><C:comp name="VTODO"/></C:supported-calendar-component-set></prop></propstat></response>`,
			),
		);
	}
	return multistatus([
		"<response><href>/dav/</href><propstat><prop><current-user-principal><href>/dav/</href></current-user-principal><C:calendar-home-set><href>/dav/calendars/</href></C:calendar-home-set></prop></propstat></response>",
	]);
}

Bun.serve({
	port: Number(process.env.FAKE_HOMELAB_PORT ?? 4999),
	fetch(request) {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/dav")) {
			return calDav(request, url.pathname);
		}
		if (url.pathname === "/api/websites") {
			return Response.json({ data: websites });
		}
		const [, , , id, endpoint] = url.pathname.split("/");
		const site = websites.find((website) => website.id === id);
		if (site && endpoint === "active") {
			return Response.json({ visitors: Math.round(site.dailyVisitors / 30) });
		}
		if (site && endpoint === "stats") {
			const span =
				Number(url.searchParams.get("endAt")) -
				Number(url.searchParams.get("startAt"));
			// "All time" starts at the epoch; call it two years.
			const days = Math.min(span / DAY_MS, 730);
			// Returning visitors make the count grow slower than the window.
			const visitors = Math.round(site.dailyVisitors * days ** 0.8);
			return Response.json({ visitors, pageviews: Math.round(visitors * 2.7) });
		}
		return new Response("ok");
	},
});
