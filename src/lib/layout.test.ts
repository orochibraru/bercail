import { expect, test } from "bun:test";
import { mergeLayout, normalizeLayout } from "./layout";

test("normalizeLayout keeps known sections once and appends the missing ones", () => {
	expect(normalizeLayout(["links", "nope", "links", "work"])).toEqual([
		"links",
		"work",
		"overview",
		"analytics",
	]);
	expect(normalizeLayout("garbage")).toEqual([
		"overview",
		"analytics",
		"work",
		"links",
	]);
});

test("mergeLayout reorders visible sections around hidden ones", () => {
	// analytics is hidden, links dragged to the top.
	expect(
		mergeLayout(
			["overview", "analytics", "work", "links"],
			["links", "overview", "work"],
		),
	).toEqual(["links", "analytics", "overview", "work"]);
});
