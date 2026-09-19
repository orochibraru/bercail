/** Dashboard sections, in their default order. Rows with two panels move as one. */
export const SECTIONS = ["overview", "analytics", "work", "links"] as const;
export type Section = (typeof SECTIONS)[number];

/** Drops unknown or repeated ids and appends missing sections, so any saved value is a full order. */
export function normalizeLayout(saved: unknown): Section[] {
	const known = new Set<Section>(
		Array.isArray(saved)
			? saved.filter((id): id is Section =>
					(SECTIONS as readonly unknown[]).includes(id),
				)
			: [],
	);
	return [...known, ...SECTIONS.filter((section) => !known.has(section))];
}

/** Puts the reordered visible sections back in place, leaving hidden ones in their slots. */
export function mergeLayout(
	layout: Section[],
	visibleOrder: Section[],
): Section[] {
	let next = 0;
	return layout.map((section) =>
		visibleOrder.includes(section)
			? (visibleOrder[next++] ?? section)
			: section,
	);
}
