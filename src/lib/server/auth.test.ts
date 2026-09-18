import { describe, expect, test } from "bun:test";
import {
	authConfigFromEnv,
	createSessionToken,
	readSessionToken,
} from "./auth";

describe("session tokens", () => {
	const session = { sub: "user-1", email: "me@example.com", expiresAt: 2_000 };

	test("round-trips a valid session", () => {
		expect(
			readSessionToken(createSessionToken(session, "secret"), "secret", 1_000),
		).toEqual(session);
	});

	test("rejects a token signed with another secret", () => {
		expect(
			readSessionToken(createSessionToken(session, "other"), "secret", 1_000),
		).toBeNull();
	});

	test("rejects a tampered payload", () => {
		const [, signature] = createSessionToken(session, "secret").split(".");
		const forged = Buffer.from(
			JSON.stringify({ ...session, sub: "admin" }),
		).toString("base64url");
		expect(
			readSessionToken(`${forged}.${signature}`, "secret", 1_000),
		).toBeNull();
	});

	test("rejects an expired or missing token", () => {
		expect(
			readSessionToken(createSessionToken(session, "secret"), "secret", 3_000),
		).toBeNull();
		expect(readSessionToken(undefined, "secret")).toBeNull();
		expect(readSessionToken("garbage", "secret")).toBeNull();
	});
});

describe("authConfigFromEnv", () => {
	test("is off without OIDC_ISSUER", () => {
		expect(authConfigFromEnv({})).toBeNull();
	});

	test("requires the client id and secret once the issuer is set", () => {
		expect(() =>
			authConfigFromEnv({ OIDC_ISSUER: "https://id.example.com" }),
		).toThrow();
	});

	test("normalizes the allowed emails", () => {
		const config = authConfigFromEnv({
			OIDC_ISSUER: "https://id.example.com",
			OIDC_CLIENT_ID: "bercail",
			OIDC_CLIENT_SECRET: "secret",
			OIDC_ALLOWED_EMAILS: " Me@Example.com, ,you@example.com",
		});
		expect(config?.allowedEmails).toEqual([
			"me@example.com",
			"you@example.com",
		]);
	});
});
