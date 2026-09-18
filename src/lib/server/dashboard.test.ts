import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { Group, Item } from "#lib/model.ts";
import { Dashboard } from "./dashboard";

// Test database
let testDb: ReturnType<typeof drizzle>;
let testSqlite: Database;
let dashboard: Dashboard;

beforeEach(() => {
	// Create an in-memory SQLite database for each test
	testSqlite = new Database(":memory:");
	testSqlite.run("PRAGMA foreign_keys = ON;");
	testDb = drizzle(testSqlite);

	// Create tables using the SQLite instance
	testSqlite.run(`
		CREATE TABLE groups_table (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			sortOrder INTEGER NOT NULL DEFAULT 0
		)
	`);

	testSqlite.run(`
		CREATE TABLE items_table (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description TEXT,
			url TEXT NOT NULL,
			target TEXT NOT NULL,
			icon TEXT,
			color TEXT,
			groupId TEXT NOT NULL REFERENCES groups_table(id) ON DELETE CASCADE,
			sortOrder INTEGER NOT NULL DEFAULT 0
		)
	`);

	// Create Dashboard instance with test database
	dashboard = new Dashboard(testDb);
});

afterEach(() => {
	testSqlite.close();
});

describe("Dashboard", () => {
	describe("createGroup", () => {
		test("should create a new group", () => {
			const group: Group = {
				id: "group-1",
				title: "Test Group",
				description: "A test group",
				items: [],
			};

			dashboard.createGroup(group);
			const groups = dashboard.listGroups();

			expect(groups).toHaveLength(1);
			expect(groups[0]).toEqual({
				id: "group-1",
				title: "Test Group",
				description: "A test group",
			});
		});

		test("should create a group without description", () => {
			const group: Group = {
				id: "group-2",
				title: "Simple Group",
				items: [],
			};

			dashboard.createGroup(group);
			const groups = dashboard.listGroups();

			expect(groups).toHaveLength(1);
			expect(groups[0]).toEqual({
				id: "group-2",
				title: "Simple Group",
			});
		});
	});

	describe("editGroupInfo", () => {
		test("should update group title and description", async () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Original Title",
				description: "Original Description",
				items: [],
			});

			await dashboard.editGroupInfo({
				id: "group-1",
				title: "Updated Title",
				description: "Updated Description",
			});

			const groups = dashboard.listGroups();
			expect(groups[0]).toEqual({
				id: "group-1",
				title: "Updated Title",
				description: "Updated Description",
			});
		});
	});

	describe("createItem", () => {
		test("should create a new item", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group",
				items: [],
			});

			const item: Item = {
				id: "item-1",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				description: "A test item",
				icon: "icon.png",
				color: "#FF0000",
				groupId: "group-1",
			};

			dashboard.createItem(item);
			const items = dashboard.listItems();

			expect(items).toHaveLength(1);
			expect(items[0]).toMatchObject({
				id: "item-1",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});
		});

		test("should throw error when groupId is missing", () => {
			const item: Item = {
				id: "item-1",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				groupId: "",
			};

			expect(() => dashboard.createItem(item)).toThrow("Missing group ID");
		});

		test("should throw error when item id is missing", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group",
				items: [],
			});

			const item: Item = {
				id: "",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			};

			expect(() => dashboard.createItem(item)).toThrow("Missing item ID");
		});

		test("should assign an incrementing sortOrder scoped to the group", () => {
			dashboard.createGroup({ id: "group-1", title: "Group 1", items: [] });
			dashboard.createGroup({ id: "group-2", title: "Group 2", items: [] });

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});
			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});
			dashboard.createItem({
				id: "item-3",
				title: "Item 3",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-2",
			});

			const items = dashboard.listItems();
			expect(items.find((i) => i.id === "item-1")?.sortOrder).toBe(0);
			expect(items.find((i) => i.id === "item-2")?.sortOrder).toBe(1);
			// A different group's sortOrder counts independently.
			expect(items.find((i) => i.id === "item-3")?.sortOrder).toBe(0);
		});
	});

	describe("reorderGroups", () => {
		test("appends new groups and lists them in the saved order", () => {
			dashboard.createGroup({ id: "group-1", title: "Group 1", items: [] });
			dashboard.createGroup({ id: "group-2", title: "Group 2", items: [] });
			dashboard.createGroup({ id: "group-3", title: "Group 3", items: [] });
			expect(dashboard.listGroups().map((g) => g.id)).toEqual([
				"group-1",
				"group-2",
				"group-3",
			]);

			dashboard.reorderGroups(["group-3", "group-1", "group-2"]);

			expect(dashboard.listGroups().map((g) => g.id)).toEqual([
				"group-3",
				"group-1",
				"group-2",
			]);
		});
	});

	describe("reorderItems", () => {
		test("reorders items within a single group", () => {
			dashboard.createGroup({ id: "group-1", title: "Group 1", items: [] });
			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});
			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.reorderItems([
				{ groupId: "group-1", itemIds: ["item-2", "item-1"] },
			]);

			const items = dashboard.listItems();
			expect(items.map((i) => i.id)).toEqual(["item-2", "item-1"]);
		});

		test("moves an item into a different group", () => {
			dashboard.createGroup({ id: "group-1", title: "Group 1", items: [] });
			dashboard.createGroup({ id: "group-2", title: "Group 2", items: [] });
			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});
			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-2",
			});

			dashboard.reorderItems([
				{ groupId: "group-1", itemIds: [] },
				{ groupId: "group-2", itemIds: ["item-2", "item-1"] },
			]);

			const result = dashboard.getFullDashboard();
			const group1 = result.groups.find((g) => g.id === "group-1");
			const group2 = result.groups.find((g) => g.id === "group-2");
			expect(group1?.items).toEqual([]);
			expect(group2?.items.map((i) => i.id)).toEqual(["item-2", "item-1"]);
		});
	});

	describe("editItem", () => {
		test("should update an existing item", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Original Title",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.editItem({
				id: "item-1",
				title: "Updated Title",
				url: "https://updated.com",
				target: "_self",
				description: "Updated description",
				icon: "new-icon.png",
				color: "#00FF00",
				groupId: "group-1",
			});

			const items = dashboard.listItems();
			expect(items[0]).toMatchObject({
				id: "item-1",
				title: "Updated Title",
				url: "https://updated.com",
				target: "_self",
				description: "Updated description",
				icon: "new-icon.png",
				color: "#00FF00",
			});
		});
	});

	describe("listGroups", () => {
		test("should return empty array when no groups exist", () => {
			const groups = dashboard.listGroups();
			expect(groups).toEqual([]);
		});

		test("should return all groups", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Group 1",
				items: [],
			});
			dashboard.createGroup({
				id: "group-2",
				title: "Group 2",
				description: "Description 2",
				items: [],
			});

			const groups = dashboard.listGroups();
			expect(groups).toHaveLength(2);
			expect(groups).toContainEqual({
				id: "group-1",
				title: "Group 1",
			});
			expect(groups).toContainEqual({
				id: "group-2",
				title: "Group 2",
				description: "Description 2",
			});
		});
	});

	describe("listItems", () => {
		test("should return empty array when no items exist", () => {
			const items = dashboard.listItems();
			expect(items).toEqual([]);
		});

		test("should return all items", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Group 1",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example1.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example2.com",
				target: "_self",
				groupId: "group-1",
			});

			const items = dashboard.listItems();
			expect(items).toHaveLength(2);
		});
	});

	describe("getFullDashboard", () => {
		test("should return groups with their items", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Group 1",
				description: "First group",
				items: [],
			});

			dashboard.createGroup({
				id: "group-2",
				title: "Group 2",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example1.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example2.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-3",
				title: "Item 3",
				url: "https://example3.com",
				target: "_self",
				groupId: "group-2",
			});

			const result = dashboard.getFullDashboard();

			expect(result.groups).toHaveLength(2);
			expect(result.groups[0].items).toHaveLength(2);
			expect(result.groups[1].items).toHaveLength(1);
			expect(result.groups[0].id).toBe("group-1");
			expect(result.groups[0].items[0].id).toBe("item-1");
		});

		test("should return groups with empty items array when group has no items", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Empty Group",
				items: [],
			});

			const result = dashboard.getFullDashboard();

			expect(result.groups).toHaveLength(1);
			expect(result.groups[0].items).toEqual([]);
		});
	});

	describe("deleteItem", () => {
		test("should delete an item", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item to Delete",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});

			expect(dashboard.listItems()).toHaveLength(1);

			dashboard.deleteItem({ itemId: "item-1" });

			expect(dashboard.listItems()).toHaveLength(0);
		});

		test("should throw error when itemId is missing", () => {
			expect(() => dashboard.deleteItem({ itemId: "" })).toThrow(
				"Missing item ID",
			);
		});
	});

	describe("deleteGroup", () => {
		test("should delete a group", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Group to Delete",
				items: [],
			});

			expect(dashboard.listGroups()).toHaveLength(1);

			dashboard.deleteGroup({ groupId: "group-1" });

			expect(dashboard.listGroups()).toHaveLength(0);
		});

		test("should cascade delete items when group is deleted", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Group to Delete",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example.com",
				target: "_blank",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example2.com",
				target: "_blank",
				groupId: "group-1",
			});

			expect(dashboard.listItems()).toHaveLength(2);

			dashboard.deleteGroup({ groupId: "group-1" });

			expect(dashboard.listGroups()).toHaveLength(0);
			expect(dashboard.listItems()).toHaveLength(0);
		});
	});
});
