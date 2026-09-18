import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import * as oidc from "openid-client";
import { SettingsRepository } from "#lib/server/settings/settings-repository.ts";

type Env = Record<string, string | undefined>;

export interface AuthConfig {
	issuer: URL;
	clientId: string;
	clientSecret: string;
	/** Empty lets in anyone the provider signs in. */
	allowedEmails: string[];
}

export interface Session {
	sub: string;
	email?: string;
	expiresAt: number;
}

export const sessionCookie = "bercail_session";
export const loginCookie = "bercail_login";
export const sessionMaxAgeSeconds = 30 * 24 * 60 * 60;

/** Auth is on when OIDC_ISSUER is set, and then the client id and secret are required. */
export function authConfigFromEnv(env: Env = process.env): AuthConfig | null {
	if (!env.OIDC_ISSUER) {
		return null;
	}
	if (!env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET) {
		throw new Error(
			"OIDC_ISSUER is set, so OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required",
		);
	}
	return {
		issuer: new URL(env.OIDC_ISSUER),
		clientId: env.OIDC_CLIENT_ID,
		clientSecret: env.OIDC_CLIENT_SECRET,
		allowedEmails: (env.OIDC_ALLOWED_EMAILS ?? "")
			.split(",")
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean),
	};
}

export const authConfig = authConfigFromEnv();

export function cookieOptions(url: URL, maxAge: number) {
	// Not tied to https, so a plain http LAN setup can still sign in.
	return {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: url.protocol === "https:",
		maxAge,
	} as const;
}

function sign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(session: Session, secret: string): string {
	const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
	return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(
	token: string | undefined,
	secret: string,
	now = Date.now(),
): Session | null {
	const [payload, signature] = token?.split(".") ?? [];
	if (!payload || !signature) {
		return null;
	}
	const expected = Buffer.from(sign(payload, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		return null;
	}
	const session: Session = JSON.parse(
		Buffer.from(payload, "base64url").toString(),
	);
	return session.expiresAt > now ? session : null;
}

let sessionSecret: string | null = null;

/** Generated once and kept in the database, so sessions survive restarts. */
export function getSessionSecret(
	repository = new SettingsRepository(),
): string {
	sessionSecret ??= repository.get("sessionSecret");
	if (!sessionSecret) {
		sessionSecret = randomBytes(32).toString("base64url");
		repository.set("sessionSecret", sessionSecret);
	}
	return sessionSecret;
}

let discovered: Promise<oidc.Configuration> | null = null;

function discover(config: AuthConfig): Promise<oidc.Configuration> {
	discovered ??= oidc
		.discovery(
			config.issuer,
			config.clientId,
			config.clientSecret,
			undefined,
			// Homelab providers are sometimes plain http on the LAN.
			config.issuer.protocol === "http:"
				? { execute: [oidc.allowInsecureRequests] }
				: undefined,
		)
		.catch((cause) => {
			discovered = null;
			throw cause;
		});
	return discovered;
}

/** Returns the provider URL to send the browser to, and the state to keep in a cookie until the callback. */
export async function startLogin(config: AuthConfig, redirectUri: string) {
	const verifier = oidc.randomPKCECodeVerifier();
	const state = oidc.randomState();
	const url = oidc.buildAuthorizationUrl(await discover(config), {
		redirect_uri: redirectUri,
		scope: "openid email",
		code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
		code_challenge_method: "S256",
		state,
	});
	return { url, verifier, state };
}

export async function finishLogin(
	config: AuthConfig,
	callbackUrl: URL,
	checks: { verifier: string; state: string },
): Promise<Session> {
	const tokens = await oidc.authorizationCodeGrant(
		await discover(config),
		callbackUrl,
		{
			pkceCodeVerifier: checks.verifier,
			expectedState: checks.state,
			idTokenExpected: true,
		},
	);
	const claims = tokens.claims();
	if (!claims) {
		throw new Error("The provider returned no ID token");
	}
	const email =
		typeof claims.email === "string" && claims.email_verified !== false
			? claims.email.toLowerCase()
			: undefined;
	if (
		config.allowedEmails.length > 0 &&
		(!email || !config.allowedEmails.includes(email))
	) {
		throw new Error(`${email ?? claims.sub} isn't in OIDC_ALLOWED_EMAILS`);
	}
	return {
		sub: claims.sub,
		email,
		expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
	};
}
