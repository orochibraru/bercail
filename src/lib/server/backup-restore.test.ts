import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { Group } from "#lib/model.ts";
import { Dashboard } from "#lib/server/dashboard.ts";

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

describe("Backup and Restore", () => {
	describe("Backup", () => {
		test("should create backup with empty dashboard", () => {
			const backup = dashboard.getFullDashboard();

			expect(backup).toEqual({ groups: [] });
		});

		test("should create backup with groups and items", () => {
			// Create test data
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group 1",
				description: "First group",
				items: [],
			});

			dashboard.createGroup({
				id: "group-2",
				title: "Test Group 2",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example1.com",
				target: "_blank",
				description: "First item",
				icon: "icon1.png",
				color: "#FF0000",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example2.com",
				target: "_self",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-3",
				title: "Item 3",
				url: "https://example3.com",
				target: "_blank",
				groupId: "group-2",
			});

			const backup = dashboard.getFullDashboard();

			expect(backup.groups).toHaveLength(2);
			expect(backup.groups[0].items).toHaveLength(2);
			expect(backup.groups[1].items).toHaveLength(1);
		});

		test("should preserve all item properties in backup", () => {
			dashboard.createGroup({
				id: "group-1",
				title: "Test Group",
				description: "Test description",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				description: "Item description",
				icon: "test-icon.png",
				color: "#0000FF",
				groupId: "group-1",
			});

			const backup = dashboard.getFullDashboard();
			const item = backup.groups[0].items[0];

			expect(item).toMatchObject({
				id: "item-1",
				title: "Test Item",
				url: "https://example.com",
				target: "_blank",
				description: "Item description",
				icon: "test-icon.png",
				color: "#0000FF",
				groupId: "group-1",
			});
		});
	});

	describe("Restore", () => {
		test("should restore empty backup", () => {
			// No groups should exist initially
			const result = dashboard.getFullDashboard();
			expect(result.groups).toHaveLength(0);
		});

		test("should restore groups and items from backup", () => {
			const backupData: { groups: Group[] } = {
				groups: [
					{
						id: "restored-group-1",
						title: "Restored Group 1",
						description: "First restored group",
						items: [
							{
								id: "restored-item-1",
								title: "Restored Item 1",
								url: "https://restored1.com",
								target: "_blank",
								description: "First restored item",
								groupId: "restored-group-1",
							},
							{
								id: "restored-item-2",
								title: "Restored Item 2",
								url: "https://restored2.com",
								target: "_self",
								groupId: "restored-group-1",
							},
						],
					},
					{
						id: "restored-group-2",
						title: "Restored Group 2",
						items: [
							{
								id: "restored-item-3",
								title: "Restored Item 3",
								url: "https://restored3.com",
								target: "_blank",
								groupId: "restored-group-2",
							},
						],
					},
				],
			};

			// Restore the data
			for (const group of backupData.groups) {
				dashboard.createGroup(group);
				for (const item of group.items) {
					dashboard.createItem(item);
				}
			}

			const result = dashboard.getFullDashboard();

			expect(result.groups).toHaveLength(2);
			expect(result.groups[0].id).toBe("restored-group-1");
			expect(result.groups[0].items).toHaveLength(2);
			expect(result.groups[1].id).toBe("restored-group-2");
			expect(result.groups[1].items).toHaveLength(1);
		});

		test("should clear existing data before restore", () => {
			// Create initial data
			dashboard.createGroup({
				id: "old-group",
				title: "Old Group",
				items: [],
			});

			dashboard.createItem({
				id: "old-item",
				title: "Old Item",
				url: "https://old.com",
				target: "_blank",
				groupId: "old-group",
			});

			// Verify initial data exists
			let result = dashboard.getFullDashboard();
			expect(result.groups).toHaveLength(1);

			// Delete all existing groups
			for (const group of result.groups) {
				dashboard.deleteGroup({ groupId: group.id });
			}

			// Restore new data
			const backupData: { groups: Group[] } = {
				groups: [
					{
						id: "new-group",
						title: "New Group",
						items: [
							{
								id: "new-item",
								title: "New Item",
								url: "https://new.com",
								target: "_blank",
								groupId: "new-group",
							},
						],
					},
				],
			};

			for (const group of backupData.groups) {
				dashboard.createGroup(group);
				for (const item of group.items) {
					dashboard.createItem(item);
				}
			}

			result = dashboard.getFullDashboard();

			expect(result.groups).toHaveLength(1);
			expect(result.groups[0].id).toBe("new-group");
			expect(result.groups[0].items[0].id).toBe("new-item");
		});

		test("should preserve optional fields during restore", () => {
			const backupData: { groups: Group[] } = {
				groups: [
					{
						id: "group-1",
						title: "Group with Description",
						description: "This has a description",
						items: [
							{
								id: "item-1",
								title: "Item with all fields",
								url: "https://example.com",
								target: "_blank",
								description: "Item description",
								icon: "icon.png",
								color: "#FF00FF",
								groupId: "group-1",
							},
						],
					},
					{
						id: "group-2",
						title: "Group without Description",
						items: [
							{
								id: "item-2",
								title: "Minimal item",
								url: "https://minimal.com",
								target: "_self",
								groupId: "group-2",
							},
						],
					},
				],
			};

			for (const group of backupData.groups) {
				dashboard.createGroup(group);
				for (const item of group.items) {
					dashboard.createItem(item);
				}
			}

			const result = dashboard.getFullDashboard();

			expect(result.groups[0].description).toBe("This has a description");
			expect(result.groups[0].items[0].description).toBe("Item description");
			expect(result.groups[0].items[0].icon).toBe("icon.png");
			expect(result.groups[0].items[0].color).toBe("#FF00FF");

			// SQLite returns null for undefined fields, not undefined
			expect(result.groups[1].description).toBeUndefined();
			expect(result.groups[1].items[0].description).toBeNull();
		});
	});

	describe("Backup and Restore Integration", () => {
		test("should restore exact copy of backed up data", () => {
			// Create original data
			dashboard.createGroup({
				id: "group-1",
				title: "Original Group 1",
				description: "First group",
				items: [],
			});

			dashboard.createGroup({
				id: "group-2",
				title: "Original Group 2",
				items: [],
			});

			dashboard.createItem({
				id: "item-1",
				title: "Item 1",
				url: "https://example1.com",
				target: "_blank",
				description: "First item",
				icon: "icon1.png",
				color: "#FF0000",
				groupId: "group-1",
			});

			dashboard.createItem({
				id: "item-2",
				title: "Item 2",
				url: "https://example2.com",
				target: "_self",
				groupId: "group-2",
			});

			// Create backup
			const backup = dashboard.getFullDashboard();

			// Clear all data
			const currentData = dashboard.getFullDashboard();
			for (const group of currentData.groups) {
				dashboard.deleteGroup({ groupId: group.id });
			}

			// Verify data is cleared
			expect(dashboard.getFullDashboard().groups).toHaveLength(0);

			// Restore from backup
			for (const group of backup.groups) {
				dashboard.createGroup(group);
				for (const item of group.items) {
					dashboard.createItem(item);
				}
			}

			// Verify restored data matches original
			const restored = dashboard.getFullDashboard();

			expect(restored.groups).toHaveLength(2);
			expect(restored.groups[0].id).toBe("group-1");
			expect(restored.groups[0].title).toBe("Original Group 1");
			expect(restored.groups[0].description).toBe("First group");
			expect(restored.groups[0].items).toHaveLength(1);
			expect(restored.groups[1].id).toBe("group-2");
			expect(restored.groups[1].items).toHaveLength(1);
		});
	});

	describe("restoreBackup", () => {
		test("replaces existing data and keeps every item field and the item order", () => {
			dashboard.createGroup({ id: "old", title: "Old", items: [] });

			const result = dashboard.restoreBackup({
				version: "1.0",
				timestamp: "2026-09-17T00:00:00.000Z",
				data: {
					groups: [
						{
							id: "group-1",
							title: "Restored",
							items: [
								{
									id: "item-b",
									title: "B",
									url: "https://b.example",
									target: "_self",
									description: "Second in the file",
									groupId: "group-1",
								},
								{
									id: "item-a",
									title: "A",
									url: "https://a.example",
									target: "_blank",
									groupId: "group-1",
								},
							],
						},
					],
				},
			});

			expect(result).toMatchObject({ groupsRestored: 1, itemsRestored: 2 });
			const { groups } = dashboard.getFullDashboard();
			expect(groups.map((group) => group.id)).toEqual(["group-1"]);
			expect(groups[0].items.map((item) => item.id)).toEqual([
				"item-b",
				"item-a",
			]);
			expect(groups[0].items[0].description).toBe("Second in the file");
		});
	});
});
