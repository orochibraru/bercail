import { z } from "zod";

export const ACCENTS = [
	"bordeaux",
	"blue",
	"teal",
	"green",
	"amber",
	"rose",
] as const;
export const FONTS = ["sans", "mono"] as const;
export const CORNERS = ["rounded", "boxy"] as const;

export const appearanceSchema = z.object({
	accent: z.enum(ACCENTS),
	font: z.enum(FONTS),
	corners: z.enum(CORNERS),
});
export type Appearance = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: Appearance = {
	accent: "bordeaux",
	font: "sans",
	corners: "rounded",
};

const lenient = z
	.object({
		accent: z.enum(ACCENTS).catch(DEFAULT_APPEARANCE.accent),
		font: z.enum(FONTS).catch(DEFAULT_APPEARANCE.font),
		corners: z.enum(CORNERS).catch(DEFAULT_APPEARANCE.corners),
	})
	.catch(DEFAULT_APPEARANCE);

/** Any stored value as a full appearance: missing or unknown fields fall back to the defaults. */
export function normalizeAppearance(saved: unknown): Appearance {
	return lenient.parse(saved);
}

/** The `<html>` attributes app.css themes from. Values are enum members, so nothing needs escaping. */
export function appearanceAttributes(appearance: Appearance): string {
	return `data-accent="${appearance.accent}" data-font="${appearance.font}" data-corners="${appearance.corners}"`;
}

export function applyAppearance(appearance: Appearance): void {
	Object.assign(document.documentElement.dataset, appearance);
}
