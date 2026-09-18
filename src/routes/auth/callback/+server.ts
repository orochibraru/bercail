import { error, redirect } from "@sveltejs/kit";
import {
	authConfig,
	cookieOptions,
	createSessionToken,
	finishLogin,
	getSessionSecret,
	loginCookie,
	type Session,
	sessionCookie,
	sessionMaxAgeSeconds,
} from "#lib/server/auth.ts";

export const GET = async ({ url, cookies }) => {
	if (!authConfig) {
		redirect(303, "/");
	}
	const checks = cookies.get(loginCookie);
	cookies.delete(loginCookie, { path: "/" });
	// Not a redirect to /auth/login: a browser that can't keep the cookie would loop through the provider.
	if (!checks) {
		error(400, "Sign-in expired or cookies are blocked, open / to try again");
	}

	let session: Session;
	try {
		session = await finishLogin(authConfig, url, JSON.parse(checks));
	} catch (cause) {
		console.error("Sign-in failed:", cause);
		error(403, "Sign-in failed");
	}
	cookies.set(
		sessionCookie,
		createSessionToken(session, getSessionSecret()),
		cookieOptions(url, sessionMaxAgeSeconds),
	);
	redirect(303, "/");
};
