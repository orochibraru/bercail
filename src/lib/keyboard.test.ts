import { expect, test } from "bun:test";
import { nextTile } from "./keyboard";

const tile = (column: number, row: number, top = row * 60) => ({
	left: column * 100,
	right: column * 100 + 90,
	top,
	bottom: top + 50,
});

// Three tasks in a row, then a group of five links in two rows a bit lower.
const boxes = [
	tile(0, 0),
	tile(1, 0),
	tile(2, 0),
	tile(0, 1, 80),
	tile(1, 1, 80),
	tile(2, 1, 80),
	tile(0, 2, 140),
	tile(1, 2, 140),
];

test("up and down keep the column across panels", () => {
	expect(nextTile(boxes, 1, "ArrowDown")).toBe(4);
	expect(nextTile(boxes, 4, "ArrowDown")).toBe(7);
	expect(nextTile(boxes, 7, "ArrowUp")).toBe(4);
	expect(nextTile(boxes, 4, "ArrowUp")).toBe(1);
});

test("down from a column the next row lacks goes to the closest tile", () => {
	expect(nextTile(boxes, 5, "ArrowDown")).toBe(7);
});

test("edges stay put, left and right follow page order", () => {
	expect(nextTile(boxes, 1, "ArrowUp")).toBe(1);
	expect(nextTile(boxes, 7, "ArrowDown")).toBe(7);
	expect(nextTile(boxes, 2, "ArrowRight")).toBe(3);
	expect(nextTile(boxes, 0, "ArrowLeft")).toBe(0);
	expect(nextTile(boxes, 4, "End")).toBe(7);
	expect(nextTile(boxes, 4, "Home")).toBe(0);
});
