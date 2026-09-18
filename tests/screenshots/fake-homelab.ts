// Stands in for the homelab during `bun run screenshots`: every link's HEAD check gets a 200, and
// /api/* answers like an Umami v3 instance with made-up but plausible numbers.
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

Bun.serve({
	port: Number(process.env.FAKE_HOMELAB_PORT ?? 4999),
	fetch(request) {
		const url = new URL(request.url);
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
