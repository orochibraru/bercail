import { afterAll, expect, test } from "bun:test";
import {
	buildTaskIcs,
	CalDavClient,
	CalDavError,
	completeTaskIcs,
	parseTasks,
	sortTasks,
	updateTaskIcs,
} from "./caldav";

const now = new Date("2026-09-18T12:00:00Z");

function vtodo(...lines: string[]) {
	return ["BEGIN:VTODO", ...lines, "END:VTODO"].join("\r\n");
}

test("parseTasks keeps open, started tasks and reads their fields", () => {
	const ics = [
		"BEGIN:VCALENDAR",
		vtodo(
			"UID:1",
			"SUMMARY:Buy milk\\, eggs",
			"DUE;VALUE=DATE:20260920",
			"PRIORITY:1",
			"BEGIN:VALARM",
			"SUMMARY:alarm text",
			"END:VALARM",
		),
		vtodo("UID:2", "SUMMARY:Call the ", " plumber", "DUE:20260918T090000Z"),
		vtodo("UID:3", "SUMMARY:Done", "STATUS:COMPLETED"),
		vtodo("UID:4", "SUMMARY:Also done", "COMPLETED:20260917T100000Z"),
		vtodo("UID:5", "SUMMARY:Later", "DTSTART:20261001T000000Z"),
		"END:VCALENDAR",
	].join("\r\n");

	expect(parseTasks(ics, "Home", now)).toEqual([
		{
			uid: "1",
			title: "Buy milk, eggs",
			list: "Home",
			due: "2026-09-20",
			priority: 1,
		},
		{
			uid: "2",
			title: "Call the plumber",
			list: "Home",
			due: "2026-09-18T09:00:00.000Z",
			priority: 0,
		},
	]);
});

test("sortTasks orders by due date, then priority, undated last", () => {
	const task = (title: string, due: string | null, priority: number) => ({
		uid: title,
		title,
		list: "L",
		due,
		priority,
	});
	const sorted = sortTasks([
		task("undated", null, 1),
		task("later", "2026-09-20", 0),
		task("soon, no priority", "2026-09-18", 0),
		task("soon, high", "2026-09-18", 1),
	]);
	expect(sorted.map((t) => t.title)).toEqual([
		"soon, high",
		"soon, no priority",
		"later",
		"undated",
	]);
});

test("buildTaskIcs escapes and folds, and parseTasks reads it back", () => {
	const title = `Buy milk, eggs; and ${"é".repeat(60)}`;
	const ics = buildTaskIcs(
		"u1",
		{ title, due: "2026-09-20", priority: 0 },
		now,
	);
	for (const line of ics.split("\r\n")) {
		expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
	}
	expect(parseTasks(ics, "L", now)).toEqual([
		{ uid: "u1", title, list: "L", due: "2026-09-20", priority: 0 },
	]);
});

test("buildTaskIcs writes a timed due date in UTC and the priority", () => {
	const ics = buildTaskIcs(
		"u2",
		{ title: "Call", due: "2026-09-20T07:30:00.000Z", priority: 5 },
		now,
	);
	expect(ics).toContain("DUE:20260920T073000Z\r\n");
	expect(parseTasks(ics, "L", now)).toEqual([
		{
			uid: "u2",
			title: "Call",
			list: "L",
			due: "2026-09-20T07:30:00.000Z",
			priority: 5,
		},
	]);
});

test("updateTaskIcs rewrites only the task's own fields", () => {
	const ics = [
		"BEGIN:VCALENDAR",
		vtodo(
			"UID:x",
			"SUMMARY:Old",
			"DUE:20260920T090000Z",
			"PRIORITY:1",
			"RRULE:FREQ=WEEKLY",
			"X-APPLE-SORT-ORDER:42",
			"BEGIN:VALARM",
			"SUMMARY:Old",
			"END:VALARM",
		),
		vtodo("UID:x", "RECURRENCE-ID:20260927T090000Z", "SUMMARY:Old"),
		"END:VCALENDAR",
	].join("\r\n");

	const updated = updateTaskIcs(
		ics,
		"x",
		{ title: "New", due: null, priority: 9 },
		now,
	);
	const [master, override] = updated.split("END:VTODO");
	expect(master).toContain("SUMMARY:New");
	expect(master).toContain("PRIORITY:9");
	expect(master).not.toContain("DUE:");
	expect(master).toContain("RRULE:FREQ=WEEKLY");
	expect(master).toContain("X-APPLE-SORT-ORDER:42");
	expect(master).toContain("BEGIN:VALARM\r\nSUMMARY:Old\r\nEND:VALARM");
	expect(override).toContain("SUMMARY:Old");
	expect(parseTasks(updated, "L", now)).toEqual([
		{ uid: "x", title: "New", list: "L", due: null, priority: 9 },
	]);
});

test("completeTaskIcs marks a task done and undoes it", () => {
	const ics = [
		"BEGIN:VCALENDAR",
		vtodo("UID:x", "SUMMARY:Do", "STATUS:NEEDS-ACTION"),
		"END:VCALENDAR",
	].join("\r\n");

	const done = completeTaskIcs(ics, "x", true, now);
	expect(done).toContain("STATUS:COMPLETED");
	expect(done.match(/STATUS:/g)).toHaveLength(1);
	expect(parseTasks(done, "L", now)).toEqual([]);

	const reopened = completeTaskIcs(done, "x", false, now);
	expect(reopened).not.toContain("COMPLETED:");
	expect(parseTasks(reopened, "L", now)).toHaveLength(1);
});

// A fake server answering the way tasks.org does: default DAV namespace, relative hrefs.
const server = Bun.serve({
	port: 0,
	async fetch(request) {
		if (request.headers.get("Authorization") !== `Basic ${btoa("me:secret")}`) {
			return new Response(null, { status: 401 });
		}
		const path = new URL(request.url).pathname;
		const multistatus = (body: string) =>
			new Response(
				`<?xml version="1.0"?><multistatus xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">${body}</multistatus>`,
				{ status: 207 },
			);
		if (path === "/") {
			return multistatus(
				"<response><href>/</href><propstat><prop><current-user-principal><href>/principals/me/</href></current-user-principal></prop></propstat></response>",
			);
		}
		if (path === "/principals/me/") {
			return multistatus(
				"<response><href>/principals/me/</href><propstat><prop><C:calendar-home-set><href>/calendars/me/</href></C:calendar-home-set></prop></propstat></response>",
			);
		}
		if (path === "/calendars/me/" && request.method === "PROPFIND") {
			return multistatus(
				[
					"<response><href>/calendars/me/</href><propstat><prop><resourcetype><collection/></resourcetype></prop></propstat></response>",
					'<response><href>/calendars/me/home/</href><propstat><prop><resourcetype><collection/><C:calendar/></resourcetype><displayname>Home &amp; Garden</displayname><C:supported-calendar-component-set><C:comp name="VTODO"/></C:supported-calendar-component-set></prop></propstat></response>',
					'<response><href>/calendars/me/events/</href><propstat><prop><resourcetype><collection/><C:calendar/></resourcetype><displayname>Events</displayname><C:supported-calendar-component-set><C:comp name="VEVENT"/></C:supported-calendar-component-set></prop></propstat></response>',
				].join(""),
			);
		}
		if (path === "/calendars/me/home/" && request.method === "REPORT") {
			return multistatus(
				stored
					? `<response><href>/calendars/me/home/a.ics</href><propstat><prop><getetag>&quot;${stored.version}&quot;</getetag><C:calendar-data>${stored.ics.replaceAll("<", "&lt;")}</C:calendar-data></prop></propstat></response>`
					: "",
			);
		}
		if (path === "/calendars/me/home/a.ics") {
			if (request.headers.get("If-Match") !== `"${stored?.version}"`) {
				return new Response(null, { status: 412 });
			}
			if (request.method === "DELETE") {
				stored = null;
				return new Response(null, { status: 204 });
			}
			stored = {
				version: (stored?.version ?? 0) + 1,
				ics: await request.text(),
			};
			return new Response(null, { status: 204 });
		}
		if (path.startsWith("/calendars/me/home/") && request.method === "PUT") {
			if (request.headers.get("If-None-Match") !== "*") {
				return new Response(null, { status: 412 });
			}
			puts.push({ path, body: await request.text() });
			return new Response(null, { status: 201 });
		}
		return new Response(null, { status: 404 });
	},
});
const puts: { path: string; body: string }[] = [];
let stored: { version: number; ics: string } | null = {
	version: 1,
	ics: `BEGIN:VCALENDAR\r\n${vtodo("UID:a", "SUMMARY:Water <plants>")}\r\nEND:VCALENDAR`,
};
afterAll(() => server.stop());

test("CalDavClient discovers task lists and reads their tasks", async () => {
	const client = new CalDavClient({
		url: server.url.origin,
		username: "me",
		password: "secret",
	});
	const homeUrl = `${server.url.origin}/calendars/me/home/`;
	expect(await client.getSnapshot()).toEqual({
		lists: [{ name: "Home & Garden", url: homeUrl }],
		tasks: [
			{
				uid: "a",
				title: "Water <plants>",
				list: "Home & Garden",
				due: null,
				priority: 0,
			},
		],
	});

	await client.addTask(homeUrl, {
		title: "Mow the lawn",
		due: "2026-09-20",
		priority: 1,
	});
	expect(puts).toHaveLength(1);
	expect(puts[0].path).toMatch(/^\/calendars\/me\/home\/[\w-]+\.ics$/);
	expect(puts[0].body).toContain("SUMMARY:Mow the lawn");

	// Only discovered lists: credentials never go to a URL the page made up.
	await expect(
		client.addTask("https://evil.example/", {
			title: "Nope",
			due: null,
			priority: 0,
		}),
	).rejects.toThrow("Unknown task list");
	expect(puts).toHaveLength(1);
});

test("CalDavClient edits and deletes with the task's ETag", async () => {
	const client = new CalDavClient(
		{ url: server.url.origin, username: "me", password: "secret" },
		0,
	);
	await client.getSnapshot();
	await client.updateTask("a", {
		title: "Water the plants",
		due: null,
		priority: 5,
	});
	expect((await client.getSnapshot()).tasks[0]).toMatchObject({
		title: "Water the plants",
		priority: 5,
	});

	// Someone else edits it: our ETag is stale and the server refuses.
	if (stored) {
		stored.version++;
	}
	const conflict = await client.deleteTask("a").catch((error) => error);
	expect(conflict).toBeInstanceOf(CalDavError);
	expect((conflict as CalDavError).status).toBe(412);

	await client.getSnapshot();
	await client.deleteTask("a");
	expect((await client.getSnapshot()).tasks).toEqual([]);
	await expect(client.deleteTask("a")).rejects.toThrow("Unknown task");
});

test("CalDavClient throws on bad credentials", async () => {
	const client = new CalDavClient({
		url: server.url.origin,
		username: "me",
		password: "wrong",
	});
	await expect(client.getSnapshot()).rejects.toThrow("status 401");
});
