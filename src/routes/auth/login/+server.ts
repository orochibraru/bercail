import { redirect } from "@sveltejs/kit";
import {
	authConfig,
	cookieOptions,
	loginCookie,
	startLogin,
} from "#lib/server/auth.ts";

export const GET = async ({ url, cookies }) => {
	if (!authConfig) {
		redirect(303, "/");
	}
	const login = await startLogin(authConfig, `${url.origin}/auth/callback`);
	cookies.set(
		loginCookie,
		JSON.stringify({ verifier: login.verifier, state: login.state }),
		cookieOptions(url, 10 * 60),
	);
	redirect(303, login.url.href, { external: true });
};
