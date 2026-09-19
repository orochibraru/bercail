import { createPrivateKey, sign } from "node:crypto";
import type { GithubConfig } from "#lib/server/settings/github-settings.ts";

const API = "https://api.github.com";

export type RunState = "success" | "failure" | "running" | "neutral";

export interface GithubRepoStatus {
	fullName: string;
	url: string;
	/** Latest run of each workflow on the default branch, newest first. */
	workflows: { name: string; state: RunState; url: string }[];
}

interface WorkflowRun {
	workflow_id: number;
	name: string | null;
	event: string;
	status: string | null;
	conclusion: string | null;
	html_url: string;
}

export function runState({ status, conclusion }: WorkflowRun): RunState {
	if (status !== "completed") {
		return "running";
	}
	if (conclusion === "success") {
		return "success";
	}
	if (
		conclusion === "failure" ||
		conclusion === "timed_out" ||
		conclusion === "startup_failure"
	) {
		return "failure";
	}
	return "neutral";
}

/**
 * What the default branch's health is made of. Leaves out pull_request_target runs (they carry
 * the base branch) and GitHub's own "dynamic" ones: Dependabot updates, CodeQL default setup.
 */
const BRANCH_EVENTS = new Set([
	"push",
	"schedule",
	"workflow_dispatch",
	"release",
	"workflow_run",
]);

/** Keeps the first (newest) branch run of each workflow. */
export function latestPerWorkflow(runs: WorkflowRun[]): WorkflowRun[] {
	const seen = new Set<number>();
	return runs.filter(
		(run) =>
			BRANCH_EVENTS.has(run.event) &&
			!seen.has(run.workflow_id) &&
			seen.add(run.workflow_id),
	);
}

/** A workflow without a `name:` is called by its path: ".github/workflows/docs-update.yaml" -> "docs-update". */
export function workflowName(name: string | null): string {
	if (!name) {
		return "Workflow";
	}
	return name.replace(/^.*\//, "").replace(/\.ya?ml$/, "");
}

/** A 9-minute app JWT, signed with the app's private key (RS256). */
export function appJwt(config: GithubConfig, now = Date.now()): string {
	const encode = (value: object) =>
		Buffer.from(JSON.stringify(value)).toString("base64url");
	const seconds = Math.floor(now / 1000);
	// Backdated a minute for clock drift, as GitHub recommends.
	const body = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: seconds - 60, exp: seconds + 540, iss: String(config.appId) })}`;
	const signature = sign(
		"sha256",
		Buffer.from(body),
		createPrivateKey(config.privateKey),
	);
	return `${body}.${signature.toString("base64url")}`;
}

/** Reads GitHub Actions statuses for every repository the app is installed on. */
export class GithubClient {
	private cache: { repos: GithubRepoStatus[]; expiresAt: number } | null = null;

	constructor(
		private readonly config: GithubConfig,
		// No dev shortcut like Umami: the 5s dashboard refresh would burn the rate limit.
		private readonly ttlMs = 60 * 1000,
	) {}

	clearCache() {
		this.cache = null;
	}

	/** Cached for ttlMs, and serves the last good result when GitHub is unreachable. */
	async getStatuses(): Promise<GithubRepoStatus[]> {
		const now = Date.now();
		if (this.cache && this.cache.expiresAt > now) {
			return this.cache.repos;
		}
		try {
			const repos = await this.fetchStatuses();
			this.cache = { repos, expiresAt: now + this.ttlMs };
			return repos;
		} catch (error) {
			if (this.cache) {
				return this.cache.repos;
			}
			throw error;
		}
	}

	private async fetchStatuses(): Promise<GithubRepoStatus[]> {
		const jwt = appJwt(this.config);
		const installations = await this.get<{ id: number }[]>(
			"/app/installations",
			jwt,
		);
		const perInstallation = await Promise.all(
			installations.map(async ({ id }) => {
				// ponytail: a fresh token per fetch (once a minute), cache it until expires_at if that ever matters.
				const { token } = await this.post<{ token: string }>(
					`/app/installations/${id}/access_tokens`,
					jwt,
				);
				// ponytail: first 100 repos only, paginate if an installation ever holds more.
				const { repositories } = await this.get<{
					repositories: {
						full_name: string;
						html_url: string;
						default_branch: string;
					}[];
				}>("/installation/repositories?per_page=100", token);
				return Promise.all(
					repositories.map(async (repo) => {
						const { workflow_runs } = await this.get<{
							workflow_runs: WorkflowRun[];
						}>(
							`/repos/${repo.full_name}/actions/runs?branch=${encodeURIComponent(repo.default_branch)}&exclude_pull_requests=true&per_page=30`,
							token,
						);
						return {
							fullName: repo.full_name,
							url: repo.html_url,
							workflows: latestPerWorkflow(workflow_runs).map((run) => ({
								name: workflowName(run.name),
								state: runState(run),
								url: run.html_url,
							})),
						};
					}),
				);
			}),
		);
		return perInstallation
			.flat()
			.sort((a, b) => a.fullName.localeCompare(b.fullName));
	}

	private get<T>(path: string, token: string): Promise<T> {
		return this.request<T>("GET", path, token);
	}

	private post<T>(path: string, token: string): Promise<T> {
		return this.request<T>("POST", path, token);
	}

	private async request<T>(
		method: string,
		path: string,
		token: string,
	): Promise<T> {
		const response = await fetch(API + path, {
			method,
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) {
			throw new Error(`GitHub ${path} failed with status ${response.status}`);
		}
		return response.json() as Promise<T>;
	}
}

/** Trades the one-time code GitHub hands back after the manifest flow for the new app's credentials. */
export async function convertManifestCode(code: string): Promise<GithubConfig> {
	const response = await fetch(
		`${API}/app-manifests/${encodeURIComponent(code)}/conversions`,
		{
			method: "POST",
			headers: { Accept: "application/vnd.github+json" },
			signal: AbortSignal.timeout(10000),
		},
	);
	if (!response.ok) {
		throw new Error(`GitHub manifest conversion failed: ${response.status}`);
	}
	const app = (await response.json()) as {
		id: number;
		slug: string;
		html_url: string;
		pem: string;
	};
	return {
		appId: app.id,
		slug: app.slug,
		htmlUrl: app.html_url,
		privateKey: app.pem,
	};
}
