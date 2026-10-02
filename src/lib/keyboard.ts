type Box = { left: number; top: number; right: number; bottom: number };

const NAV_KEYS = [
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"Home",
	"End",
] as const;
type NavKey = (typeof NAV_KEYS)[number];

export const isNavKey = (key: string): key is NavKey =>
	(NAV_KEYS as readonly string[]).includes(key);

/**
 * The tile a key moves to: left/right step through page order, up/down pick the closest tile in
 * the nearest row above or below, whatever group or panel it's in. Stays put at the edges.
 */
export function nextTile(boxes: Box[], from: number, key: NavKey): number {
	if (key === "Home") {
		return 0;
	}
	if (key === "End") {
		return boxes.length - 1;
	}
	if (key === "ArrowLeft") {
		return Math.max(0, from - 1);
	}
	if (key === "ArrowRight") {
		return Math.min(boxes.length - 1, from + 1);
	}

	const current = boxes[from];
	const down = key === "ArrowDown";
	const candidates = boxes
		.map((box, index) => ({ box, index }))
		.filter(({ box }) =>
			down ? box.top >= current.bottom - 1 : box.bottom <= current.top + 1,
		);
	if (candidates.length === 0) {
		return from;
	}

	const edge = (box: Box) => (down ? box.top : -box.bottom);
	const nearestRow = Math.min(...candidates.map(({ box }) => edge(box)));
	const centerX = (box: Box) => (box.left + box.right) / 2;
	const [best] = candidates
		.filter(({ box }) => edge(box) - nearestRow < (box.bottom - box.top) / 2)
		.sort(
			(a, b) =>
				Math.abs(centerX(a.box) - centerX(current)) -
				Math.abs(centerX(b.box) - centerX(current)),
		);
	return best.index;
}

/** Keys typed here belong to the field or widget, not to the page's shortcuts. */
export function isOwnedByWidget(target: EventTarget | null): boolean {
	return (
		target instanceof Element &&
		target.closest(
			'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]',
		) !== null
	);
}

/** Moves focus between `[data-nav]` tiles with the arrow keys, Home and End. */
export function navigateTiles(event: KeyboardEvent): void {
	// svelte-dnd-action handles arrows itself while a link is being dragged with the keyboard.
	if (
		!isNavKey(event.key) ||
		event.defaultPrevented ||
		event.metaKey ||
		event.ctrlKey ||
		event.altKey ||
		isOwnedByWidget(event.target)
	) {
		return;
	}
	const tiles = [...document.querySelectorAll<HTMLElement>("[data-nav]")];
	if (tiles.length === 0) {
		return;
	}
	const from = tiles.indexOf(document.activeElement as HTMLElement);
	// From anywhere else, like the page itself or a header button, any arrow starts at the first tile.
	if (from === -1) {
		event.preventDefault();
		tiles[0].focus();
		return;
	}
	event.preventDefault();
	const boxes = tiles.map((tile) => tile.getBoundingClientRect());
	tiles[nextTile(boxes, from, event.key)].focus();
}
