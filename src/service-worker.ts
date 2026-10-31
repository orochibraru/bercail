/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { version } from "$app/env";
import { assets, immutable } from "$app/manifest";

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `bercail-${version}`;
const precached = new Set(
	[...immutable, ...assets].map(
		({ path }) => new URL(path, worker.location.origin).pathname,
	),
);

worker.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(cacheName)
			.then((cache) => cache.addAll([...precached]))
			.then(() => worker.skipWaiting()),
	);
});

worker.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== cacheName)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => worker.clients.claim()),
	);
});

worker.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== "GET" || url.origin !== worker.location.origin) {
		return;
	}

	if (precached.has(url.pathname)) {
		event.respondWith(
			caches
				.match(url.pathname)
				.then((cached) => cached ?? fetch(event.request)),
		);
		return;
	}

	// The home page paints from the last visit's HTML while a fresh copy is fetched for the next one.
	if (event.request.mode === "navigate" && url.pathname === "/") {
		const network = fetch(event.request);
		const saved = network.then((response) => {
			// Dropped on an auth redirect too, so an expired session reaches the sign-in page on the next visit.
			const copy = response.ok ? stamp(response.clone()) : null;
			return caches
				.open(cacheName)
				.then((cache) => (copy ? cache.put("/", copy) : cache.delete("/")));
		});
		event.waitUntil(saved.catch(() => {}));
		event.respondWith(
			caches.match("/", { cacheName }).then((cached) => {
				if (cached && isFresh(cached)) {
					return cached;
				}
				// An old copy would paint hours-old data, then swap everything at once when it refreshes.
				// Offline, it still beats an error page.
				return network.catch((error) => cached ?? Promise.reject(error));
			}),
		);
	}
});

const cachedAtHeader = "x-bercail-cached-at";
// Short enough that the swap to live data is barely visible, long enough to cover tabs opened in a row.
const freshForMs = 5 * 60 * 1000;

function stamp(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set(cachedAtHeader, String(Date.now()));
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

function isFresh(response: Response): boolean {
	const cachedAt = Number(response.headers.get(cachedAtHeader));
	return Date.now() - cachedAt < freshForMs;
}
