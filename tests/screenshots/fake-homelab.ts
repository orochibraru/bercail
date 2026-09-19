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

const seed: Record<string, [string, string | null, number][]> = {
	Homelab: [
		["Renew the domain", icsDate(-1), 1],
		["Replace the UPS battery", icsDate(0, 18), 5],
		["Test restoring a Vaultwarden backup", icsDate(1), 1],
		["Update Proxmox to the new release", icsDate(3, 20), 5],
		["Label the cables in the rack", null, 9],
		["Try out a new dashboard theme", null, 9],
	],
	Home: [
		["Take the bins out", icsDate(0, 20), 0],
		["Book the boiler service", icsDate(9), 0],
		["Fix the garden gate", null, 0],
	],
};

/** List name -> file name -> iCalendar text. */
const lists = new Map(
	Object.entries(seed).map(([name, tasks]) => [
		name,
		new Map(
			tasks.map(([title, due, priority], index) => [
				`${index}.ics`,
				[
					"BEGIN:VCALENDAR",
					"BEGIN:VTODO",
					`UID:${name}-${index}`,
					`SUMMARY:${title}`,
					...(due ? [`DUE${due}`] : []),
					`PRIORITY:${priority}`,
					"END:VTODO",
					"END:VCALENDAR",
				].join("\r\n"),
			]),
		),
	]),
);

function multistatus(responses: string[]): Response {
	return new Response(
		`<?xml version="1.0"?><multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">${responses.join("")}</multistatus>`,
		{ status: 207, headers: { "Content-Type": "application/xml" } },
	);
}

async function calDav(request: Request, path: string): Promise<Response> {
	const [, , , encodedList, file] = path.split("/");
	const list = lists.get(decodeURIComponent(encodedList ?? ""));
	if (request.method === "PUT" && list && file) {
		list.set(file, await request.text());
		return new Response(null, { status: 201 });
	}
	if (request.method === "DELETE" && list && file) {
		list.delete(file);
		return new Response(null, { status: 204 });
	}
	if (request.method === "REPORT" && list) {
		return multistatus(
			[...list].map(
				([name, ics]) =>
					`<response><href>${path}${name}</href><propstat><prop><getetag>"${Bun.hash(ics)}"</getetag><C:calendar-data>${ics.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</C:calendar-data></prop></propstat></response>`,
			),
		);
	}
	if (path === "/dav/calendars/") {
		return multistatus(
			[...lists.keys()].map(
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
