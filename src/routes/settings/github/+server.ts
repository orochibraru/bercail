import { error, redirect } from "@sveltejs/kit";
import { convertManifestCode } from "#lib/server/monitoring/github.ts";
import {
	GITHUB_STATE_COOKIE,
	GithubSettings,
} from "#lib/server/settings/github-settings.ts";

/** GitHub sends the browser here once the app is created from the manifest. */
export const GET = async ({ url, cookies }) => {
	const state = cookies.get(GITHUB_STATE_COOKIE);
	cookies.delete(GITHUB_STATE_COOKIE, { path: "/" });
	const code = url.searchParams.get("code");
	if (!state || state !== url.searchParams.get("state") || !code) {
		error(400, "GitHub registration expired, start again from Settings");
	}

	let config: Awaited<ReturnType<typeof convertManifestCode>>;
	try {
		config = await convertManifestCode(code);
	} catch (cause) {
		console.error("GitHub App registration failed:", cause);
		error(502, "Couldn't finish registering the GitHub App");
	}
	new GithubSettings().set(config);
	// Straight on to picking the repositories to watch.
	redirect(303, `${config.htmlUrl}/installations/new`);
};
