import { randomBytes } from "node:crypto";
import { z } from "zod";
import { cookieOptions } from "#lib/server/auth.ts";
import {
	GITHUB_STATE_COOKIE,
	GithubSettings,
} from "#lib/server/settings/github-settings.ts";
import { command, getRequestEvent, query } from "$app/server";

const githubSettings = new GithubSettings();

/** The private key never leaves the server. */
export const getGithubSettings = query(() => {
	const config = githubSettings.get();
	return config ? { slug: config.slug, htmlUrl: config.htmlUrl } : null;
});

/**
 * Builds the GitHub App manifest the page POSTs to github.com. GitHub then sends the browser
 * back to /settings/github with a code, and the state cookie proves we started that round trip.
 */
export const startGithubRegistration = command(
	z.object({ organization: z.string().trim() }),
	({ organization }) => {
		const { url, cookies } = getRequestEvent();
		const state = randomBytes(16).toString("hex");
		cookies.set(GITHUB_STATE_COOKIE, state, cookieOptions(url, 10 * 60));

		const owner = organization
			? `organizations/${encodeURIComponent(organization)}`
			: "";
		return {
			action: `https://github.com/${owner}${owner && "/"}settings/apps/new?state=${state}`,
			manifest: JSON.stringify({
				// App names are unique across GitHub; the user can still rename it before creating.
				name: `Bercail ${url.hostname}`.slice(0, 34),
				url: url.origin,
				redirect_url: `${url.origin}/settings/github`,
				// Where GitHub lands after the app is installed or its repositories change.
				setup_url: `${url.origin}/settings`,
				setup_on_update: true,
				public: false,
				hook_attributes: { url: url.origin, active: false },
				default_permissions: { actions: "read", metadata: "read" },
			}),
		};
	},
);

/** Forgets the app here; it stays registered on GitHub until deleted there. */
export const clearGithubSettings = command(() => {
	githubSettings.clear();
});
