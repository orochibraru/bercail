import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { green, Log } from "@kitql/helpers";
import { redirect } from "@sveltejs/kit";
import type { Handle, ServerInit } from "@sveltejs/kit/hooks";
import {
	authConfig,
	cookieOptions,
	createSessionToken,
	getSessionSecret,
	readSessionToken,
	sessionCookie,
	sessionMaxAgeSeconds,
} from "#lib/server/auth.ts";
import { dbFileName } from "#lib/server/db/index.ts";
import { migrateDatabase } from "#lib/server/db/migrate.ts";

const logger = new Log("Hooks");

export const init: ServerInit = async () => {
	// Ensure database directory exists
	const dbDir = dirname(dbFileName);
	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
		logger.info(`Created database directory: ${dbDir}`);
	}

	migrateDatabase();
};

export const handle: Handle = async ({ event, resolve }) => {
	logger.info(`${green(event.request.method)} ${event.url.href}`);

	// Static files, including the service worker, are served before this hook and stay public.
	if (authConfig && !event.url.pathname.startsWith("/auth/")) {
		const secret = getSessionSecret();
		const session = readSessionToken(event.cookies.get(sessionCookie), secret);
		if (!session) {
			// SvelteKit turns this into a client-side redirect for data and remote function requests.
			redirect(303, "/auth/login");
		}
		// Sliding expiry: a new tab page used daily never has to sign in again.
		if (session.expiresAt - Date.now() < (sessionMaxAgeSeconds * 1000) / 2) {
			const renewed = {
				...session,
				expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
			};
			event.cookies.set(
				sessionCookie,
				createSessionToken(renewed, secret),
				cookieOptions(event.url, sessionMaxAgeSeconds),
			);
		}
	}

	return resolve(event);
};
