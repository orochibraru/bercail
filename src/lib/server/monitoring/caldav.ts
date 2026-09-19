import type { CalDavConfig } from "#lib/server/settings/caldav-settings.ts";

export interface Task {
	uid: string;
	title: string;
	list: string;
	/** "2026-09-18" for an all-day due date, a full ISO timestamp otherwise. */
	due: string | null;
	/** iCalendar priority: 1 is highest, 9 lowest, 0 none. */
	priority: number;
}

export interface TaskList {
	name: string;
	url: string;
}

interface TaskResource {
	url: string;
	etag: string;
	ics: string;
}

export class CalDavError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

export interface TasksSnapshot {
	lists: TaskList[];
	tasks: Task[];
}

/** Text of the first <tag> (any namespace prefix) in xml, or "". */
function xmlTag(xml: string, tag: string): string {
	const match = xml.match(
		new RegExp(
			`<(?:[\\w-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`,
		),
	);
	return match?.[1] ?? "";
}

function xmlResponses(xml: string): string[] {
	return (
		xml.match(/<(?:[\w-]+:)?response\b[\s\S]*?<\/(?:[\w-]+:)?response>/g) ?? []
	);
}

function unescapeXml(text: string): string {
	return text
		.replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, "$1")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
			String.fromCharCode(Number.parseInt(code, 16)),
		)
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&");
}

function unescapeIcsText(text: string): string {
	return text.replace(/\\([\\;,nN])/g, (_, char) =>
		char === "n" || char === "N" ? "\n" : char,
	);
}

/** 20260918 -> "2026-09-18"; 20260918T090000Z -> ISO timestamp. */
function parseIcsDate(value: string): string | null {
	const match = value.match(
		/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/,
	);
	if (!match) {
		return null;
	}
	const [, y, mo, d, h, mi, s, utc] = match;
	if (h === undefined) {
		return `${y}-${mo}-${d}`;
	}
	// ponytail: TZID and floating times are read in the server's zone; resolve TZID if lists span zones.
	const date = utc
		? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
		: new Date(+y, +mo - 1, +d, +h, +mi, +s);
	return date.toISOString();
}

/** Open tasks in an iCalendar document; completed, cancelled and not-yet-started ones are left out. */
export function parseTasks(
	ics: string,
	list: string,
	now = new Date(),
): Task[] {
	const lines = ics.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
	const tasks: Task[] = [];
	let props: Map<string, string> | null = null;
	let nested = 0;

	for (const line of lines) {
		if (line === "BEGIN:VTODO") {
			props = new Map();
		} else if (line === "END:VTODO" && props) {
			const status = props.get("STATUS");
			const start = parseIcsDate(props.get("DTSTART") ?? "");
			const isOverride = props.has("RECURRENCE-ID");
			const done =
				isOverride ||
				props.has("COMPLETED") ||
				status === "COMPLETED" ||
				status === "CANCELLED";
			const notStarted = start !== null && new Date(start) > now;
			if (!done && !notStarted) {
				tasks.push({
					uid: props.get("UID") ?? crypto.randomUUID(),
					title: unescapeIcsText(props.get("SUMMARY") ?? "Untitled"),
					list,
					due: parseIcsDate(props.get("DUE") ?? ""),
					priority: Number(props.get("PRIORITY")) || 0,
				});
			}
			props = null;
		} else if (props && line.startsWith("BEGIN:")) {
			nested++; // VALARM and friends: their properties aren't the task's.
		} else if (props && line.startsWith("END:")) {
			nested--;
		} else if (props && nested === 0) {
			const colon = line.indexOf(":");
			if (colon > 0) {
				const name = line.slice(0, colon).split(";")[0].toUpperCase();
				props.set(name, line.slice(colon + 1));
			}
		}
	}
	return tasks;
}

function escapeIcsText(text: string): string {
	return text.replace(/[\\;,]/g, "\\$&").replace(/\r?\n/g, "\\n");
}

/** Splits a content line into 75-octet pieces, as RFC 5545 requires, without cutting a character. */
function foldIcsLine(line: string): string {
	const encoder = new TextEncoder();
	let folded = "";
	let octets = 0;
	for (const char of line) {
		const size = encoder.encode(char).length;
		if (octets + size > 75) {
			folded += "\r\n ";
			octets = 1;
		}
		folded += char;
		octets += size;
	}
	return folded;
}

export interface NewTask {
	title: string;
	/** "2026-09-18" for all day, a full ISO timestamp for a set time. */
	due: string | null;
	priority: number;
}

function icsTimestamp(date: Date): string {
	return date.toISOString().replace(/[-:]|\.\d+/g, "");
}

function icsDue(due: string): string {
	return due.length === 10
		? `DUE;VALUE=DATE:${due.replaceAll("-", "")}`
		: `DUE:${icsTimestamp(new Date(due))}`;
}

function taskLines(task: NewTask, stamp: string): string[] {
	return [
		`DTSTAMP:${stamp}`,
		`SUMMARY:${escapeIcsText(task.title)}`,
		...(task.due ? [icsDue(task.due)] : []),
		...(task.priority ? [`PRIORITY:${task.priority}`] : []),
	];
}

function serializeIcs(lines: string[]): string {
	return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildTaskIcs(
	uid: string,
	task: NewTask,
	now = new Date(),
): string {
	const stamp = icsTimestamp(now);
	return serializeIcs([
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Bercail//EN",
		"BEGIN:VTODO",
		`UID:${uid}`,
		`CREATED:${stamp}`,
		...taskLines(task, stamp),
		"STATUS:NEEDS-ACTION",
		"END:VTODO",
		"END:VCALENDAR",
	]);
}

const REPLACED_PROPERTIES = new Set([
	"DTSTAMP",
	"LAST-MODIFIED",
	"SUMMARY",
	"DUE",
	"DURATION",
	"PRIORITY",
]);

/** Rewrites title, due date and priority of the task `uid`, keeping every other property. */
export function updateTaskIcs(
	ics: string,
	uid: string,
	task: NewTask,
	now = new Date(),
): string {
	const lines = ics
		.replace(/\r?\n[ \t]/g, "")
		.split(/\r?\n/)
		.filter(Boolean);
	const stamp = icsTimestamp(now);
	const output: string[] = [];
	let block: string[] | null = null;

	for (const line of lines) {
		if (line === "BEGIN:VTODO") {
			block = [];
		} else if (line === "END:VTODO" && block) {
			let depth = 0;
			const isOwn = block.map((blockLine) => {
				if (blockLine.startsWith("BEGIN:")) {
					depth++;
				}
				const own = depth === 0;
				if (blockLine.startsWith("END:")) {
					depth--;
				}
				return own;
			});
			const own = block.filter((_, index) => isOwn[index]);
			const name = (blockLine: string) =>
				blockLine.slice(0, blockLine.search(/[;:]/)).toUpperCase();
			const isTarget =
				own.includes(`UID:${uid}`) &&
				!own.some((ownLine) => name(ownLine) === "RECURRENCE-ID");
			const kept = isTarget
				? block.filter(
						(blockLine, index) =>
							!isOwn[index] || !REPLACED_PROPERTIES.has(name(blockLine)),
					)
				: block;
			output.push(
				"BEGIN:VTODO",
				...kept,
				...(isTarget
					? [...taskLines(task, stamp), `LAST-MODIFIED:${stamp}`]
					: []),
				"END:VTODO",
			);
			block = null;
		} else if (block) {
			block.push(line);
		} else {
			output.push(line);
		}
	}
	return serializeIcs(output);
}

/** Due first (soonest first, undated last), then by priority, then by title. */
export function sortTasks(tasks: Task[]): Task[] {
	const rank = (priority: number) => (priority === 0 ? 10 : priority);
	const byDue = (a: string | null, b: string | null) =>
		a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1;
	return tasks.toSorted(
		(a, b) =>
			byDue(a.due, b.due) ||
			rank(a.priority) - rank(b.priority) ||
			a.title.localeCompare(b.title),
	);
}

/** Reads open tasks from a CalDAV server (tasks.org, Nextcloud, Radicale, ...) and adds new ones. */
export class CalDavClient {
	private cache: { snapshot: TasksSnapshot; expiresAt: number } | null = null;
	private lists: TaskList[] | null = null;
	private resources = new Map<string, TaskResource>();

	constructor(
		private readonly config: CalDavConfig,
		private readonly ttlMs = 60 * 1000,
	) {}

	/** Cached for ttlMs, and serves the last good result when the server is unreachable. */
	async getSnapshot(): Promise<TasksSnapshot> {
		const now = Date.now();
		if (this.cache && this.cache.expiresAt > now) {
			return this.cache.snapshot;
		}
		try {
			this.lists ??= await this.discoverLists();
			const lists = this.lists;
			const resources = new Map<string, TaskResource>();
			const perList = await Promise.all(
				lists.map((list) => this.fetchTasks(list, resources)),
			);
			this.resources = resources;
			const snapshot = { lists, tasks: sortTasks(perList.flat()) };
			this.cache = { snapshot, expiresAt: now + this.ttlMs };
			return snapshot;
		} catch (error) {
			// Lists may have been added, renamed or moved; look them up again next time.
			this.lists = null;
			if (this.cache) {
				return this.cache.snapshot;
			}
			throw error;
		}
	}

	clearCache() {
		this.cache = null;
		this.lists = null;
	}

	async addTask(listUrl: string, task: NewTask) {
		this.lists ??= await this.discoverLists();
		// Only a discovered list: the credentials must never be sent to a URL the page made up.
		const list = this.lists.find((candidate) => candidate.url === listUrl);
		if (!list) {
			throw new Error(`Unknown task list ${listUrl}`);
		}
		const uid = crypto.randomUUID();
		const collection = list.url.endsWith("/") ? list.url : `${list.url}/`;
		await this.request(
			new URL(`${uid}.ics`, collection).toString(),
			"PUT",
			buildTaskIcs(uid, task),
			// Never overwrite an existing task.
			{ "Content-Type": "text/calendar; charset=utf-8", "If-None-Match": "*" },
		);
		this.cache = null;
	}

	async updateTask(uid: string, task: NewTask) {
		const resource = await this.resource(uid);
		await this.request(
			resource.url,
			"PUT",
			updateTaskIcs(resource.ics, uid, task),
			{
				"Content-Type": "text/calendar; charset=utf-8",
				...this.ifMatch(resource),
			},
		);
		this.cache = null;
	}

	async deleteTask(uid: string) {
		const resource = await this.resource(uid);
		await this.request(resource.url, "DELETE", "", this.ifMatch(resource));
		this.cache = null;
	}

	/** Only tasks read from the server: the page never picks the URL the credentials go to. */
	private async resource(uid: string): Promise<TaskResource> {
		if (!this.resources.has(uid)) {
			this.cache = null;
			await this.getSnapshot();
		}
		const resource = this.resources.get(uid);
		if (!resource) {
			throw new Error(`Unknown task ${uid}`);
		}
		return resource;
	}

	private ifMatch(resource: TaskResource): Record<string, string> {
		return resource.etag ? { "If-Match": resource.etag } : {};
	}

	/** Principal -> calendar home -> the collections that hold tasks. */
	private async discoverLists(): Promise<TaskList[]> {
		const principal = await this.propfind(
			this.config.url,
			0,
			"<d:current-user-principal/>",
		);
		const principalUrl = this.href(
			xmlTag(xmlTag(principal, "current-user-principal"), "href"),
		);

		const home = await this.propfind(principalUrl, 0, "<c:calendar-home-set/>");
		const homeUrl = this.href(
			xmlTag(xmlTag(home, "calendar-home-set"), "href"),
		);

		const collections = await this.propfind(
			homeUrl,
			1,
			"<d:resourcetype/><d:displayname/><c:supported-calendar-component-set/>",
		);
		return xmlResponses(collections)
			.filter((response) => {
				const isCalendar = /<(?:[\w-]+:)?calendar(?![\w-])/.test(
					xmlTag(response, "resourcetype"),
				);
				const components = xmlTag(response, "supported-calendar-component-set");
				// Servers that don't say which components they take might hold tasks.
				return isCalendar && (!components || /"VTODO"/i.test(components));
			})
			.map((response) => ({
				name: unescapeXml(xmlTag(response, "displayname")) || "Tasks",
				url: this.href(xmlTag(response, "href")),
			}));
	}

	private async fetchTasks(
		list: TaskList,
		resources: Map<string, TaskResource>,
	): Promise<Task[]> {
		const xml = await this.request(
			list.url,
			"REPORT",
			`<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
				<d:prop><d:getetag/><c:calendar-data/></d:prop>
				<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VTODO"/></c:comp-filter></c:filter>
			</c:calendar-query>`,
			{ Depth: "1" },
		);
		return xmlResponses(xml).flatMap((response) => {
			const ics = unescapeXml(xmlTag(response, "calendar-data"));
			const tasks = parseTasks(ics, list.name);
			const resource = {
				url: this.href(xmlTag(response, "href")),
				etag: unescapeXml(xmlTag(response, "getetag").trim()),
				ics,
			};
			for (const task of tasks) {
				resources.set(task.uid, resource);
			}
			return tasks;
		});
	}

	private propfind(url: string, depth: 0 | 1, props: string) {
		return this.request(
			url,
			"PROPFIND",
			`<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop>${props}</d:prop></d:propfind>`,
			{ Depth: String(depth) },
		);
	}

	private href(href: string): string {
		if (!href.trim()) {
			throw new Error("CalDAV server didn't return the expected href");
		}
		return new URL(unescapeXml(href.trim()), this.config.url).toString();
	}

	private async request(
		url: string,
		method: string,
		body: string,
		headers: Record<string, string>,
	): Promise<string> {
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`,
				"Content-Type": "application/xml; charset=utf-8",
				...headers,
			},
			body,
			signal: AbortSignal.timeout(10_000),
		});
		if (!response.ok) {
			throw new CalDavError(
				`CalDAV ${method} ${url} failed with status ${response.status}`,
				response.status,
			);
		}
		return response.text();
	}
}
