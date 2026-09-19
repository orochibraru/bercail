import { expect, test } from "bun:test";
import { generateKeyPairSync, verify } from "node:crypto";
import { appJwt, latestPerWorkflow, runState, workflowName } from "./github";

const run = (
	workflow_id: number,
	status: string,
	conclusion?: string,
	event = "push",
) => ({
	workflow_id,
	name: `wf${workflow_id}`,
	event,
	status,
	conclusion: conclusion ?? null,
	html_url: "",
});

test("runState maps GitHub run status and conclusion", () => {
	expect(runState(run(1, "in_progress"))).toBe("running");
	expect(runState(run(1, "queued"))).toBe("running");
	expect(runState(run(1, "completed", "success"))).toBe("success");
	expect(runState(run(1, "completed", "timed_out"))).toBe("failure");
	expect(runState(run(1, "completed", "cancelled"))).toBe("neutral");
});

test("latestPerWorkflow keeps the newest branch run of each workflow", () => {
	const runs = [
		run(3, "completed", "success", "dynamic"),
		run(4, "completed", "success", "pull_request_target"),
		run(1, "completed", "failure"),
		run(2, "completed", "success", "schedule"),
		run(1, "completed", "success"),
	];
	expect(latestPerWorkflow(runs)).toEqual([runs[2], runs[3]]);
});

test("workflowName turns a bare path into the file name", () => {
	expect(workflowName(".github/workflows/docs-update.yaml")).toBe(
		"docs-update",
	);
	expect(workflowName("CI")).toBe("CI");
	expect(workflowName(null)).toBe("Workflow");
});

test("appJwt is a verifiable RS256 token issued by the app", () => {
	// GitHub hands out PKCS#1 keys.
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
		privateKeyEncoding: { type: "pkcs1", format: "pem" },
		publicKeyEncoding: { type: "spki", format: "pem" },
	});
	const jwt = appJwt(
		{ appId: 42, slug: "s", htmlUrl: "https://github.com/apps/s", privateKey },
		1_000_000_000_000,
	);
	const [header, payload, signature] = jwt.split(".");
	expect(
		verify(
			"sha256",
			Buffer.from(`${header}.${payload}`),
			publicKey,
			Buffer.from(signature ?? "", "base64url"),
		),
	).toBe(true);
	expect(
		JSON.parse(Buffer.from(payload ?? "", "base64url").toString()),
	).toEqual({ iat: 999_999_940, exp: 1_000_000_540, iss: "42" });
});
