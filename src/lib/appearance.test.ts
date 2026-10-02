import { expect, test } from "bun:test";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "./appearance";

test("normalizeAppearance keeps valid fields and falls back on the rest", () => {
	expect(
		normalizeAppearance({ accent: "teal", font: "comic", corners: "boxy" }),
	).toEqual({ accent: "teal", font: "sans", corners: "boxy" });
	expect(normalizeAppearance({})).toEqual(DEFAULT_APPEARANCE);
	expect(normalizeAppearance("garbage")).toEqual(DEFAULT_APPEARANCE);
	expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
});
