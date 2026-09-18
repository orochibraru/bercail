import { expect, test } from "bun:test";
import { UmamiClient } from "./umami";

test("selectWebsites keeps only the configured domains, in that order", () => {
	const config = { host: "http://u", apiKey: "k", websites: [] };
	const websites = [
		{ domain: "a.com" },
		{ domain: "B.com" },
		{ domain: "c.com" },
	];

	expect(new UmamiClient(config).selectWebsites(websites)).toEqual(websites);
	expect(
		new UmamiClient({
			...config,
			websites: ["c.com", "b.com", "missing.com"],
		}).selectWebsites(websites),
	).toEqual([{ domain: "c.com" }, { domain: "B.com" }]);
});
