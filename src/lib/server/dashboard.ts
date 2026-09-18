import { eq, max } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { BackupFile, Group, Item, RestoreResult } from "#lib/model.ts";
import { db } from "#lib/server/db/index.ts";
import { groupsTable, itemsTable } from "#lib/server/db/schema.ts";

export interface GroupItemOrder {
	groupId: string;
	itemIds: string[];
}

export class Dashboard {
	private db: BunSQLiteDatabase<Record<string, unknown>>;

	public constructor(database?: BunSQLiteDatabase<Record<string, unknown>>) {
		this.db = database ?? db;
	}

	public editGroupInfo(group: Omit<Group, "items">): void {
		this.db
			.update(groupsTable)
			.set({
				title: group.title,
				description: group.description,
			})
			.where(eq(groupsTable.id, group.id))
			.run();
	}

	public editItem(data: Item): void {
		this.db
			.update(itemsTable)
			.set({
				title: data.title,
				url: data.url,
				target: data.target,
				description: data.description,
				icon: data.icon,
				color: data.color,
				groupId: data.groupId,
			})
			.where(eq(itemsTable.id, data.id))
			.run();
	}

	public createItem(data: Item): void {
		if (!data.groupId) {
			throw new Error("Missing group ID");
		}

		if (!data.id) {
			throw new Error("Missing item ID");
		}

		const [{ maxSortOrder }] = this.db
			.select({ maxSortOrder: max(itemsTable.sortOrder) })
			.from(itemsTable)
			.where(eq(itemsTable.groupId, data.groupId))
			.all();

		this.db
			.insert(itemsTable)
			.values({
				id: data.id,
				title: data.title,
				url: data.url,
				target: data.target,
				description: data.description,
				icon: data.icon,
				color: data.color,
				groupId: data.groupId,
				sortOrder: maxSortOrder === null ? 0 : maxSortOrder + 1,
			})
			.run();
	}

	public listItems(): Item[] {
		return this.db
			.select()
			.from(itemsTable)
			.orderBy(itemsTable.sortOrder)
			.all();
	}

	/** Persists a drag-and-drop reorder: sets groupId and a fresh sortOrder for every item listed, per affected group. */
	public reorderItems(groupOrders: GroupItemOrder[]): void {
		this.db.transaction((tx) => {
			for (const { groupId, itemIds } of groupOrders) {
				itemIds.forEach((itemId, index) => {
					tx.update(itemsTable)
						.set({ groupId, sortOrder: index })
						.where(eq(itemsTable.id, itemId))
						.run();
				});
			}
		});
	}

	public reorderGroups(groupIds: string[]): void {
		this.db.transaction((tx) => {
			groupIds.forEach((groupId, index) => {
				tx.update(groupsTable)
					.set({ sortOrder: index })
					.where(eq(groupsTable.id, groupId))
					.run();
			});
		});
	}

	public listGroups(): Omit<Group, "items">[] {
		const groups = this.db
			.select()
			.from(groupsTable)
			.orderBy(groupsTable.sortOrder)
			.all();
		return groups.map(({ id, title, description }) => ({
			id,
			title,
			description: description || undefined,
		}));
	}

	public getFullDashboard(): { groups: Group[] } {
		const groupsData = this.listGroups();
		const itemsData = this.listItems();

		const groups: Group[] = groupsData.map((group) => {
			const items = itemsData.filter((item) => item.groupId === group.id);
			return {
				...group,
				items,
			};
		});
		return { groups };
	}

	public createGroup(group: Group): void {
		const [{ maxSortOrder }] = this.db
			.select({ maxSortOrder: max(groupsTable.sortOrder) })
			.from(groupsTable)
			.all();

		this.db
			.insert(groupsTable)
			.values({
				id: group.id,
				title: group.title,
				description: group.description,
				sortOrder: maxSortOrder === null ? 0 : maxSortOrder + 1,
			})
			.run();
	}

	public deleteItem({ itemId }: { itemId: string }): void {
		if (!itemId) {
			throw new Error("Missing item ID");
		}

		this.db.delete(itemsTable).where(eq(itemsTable.id, itemId)).run();
	}

	public deleteGroup({ groupId }: { groupId: string }): void {
		// Items will be cascade deleted due to foreign key constraint
		this.db.delete(groupsTable).where(eq(groupsTable.id, groupId)).run();
	}

	/** Replaces every group and item with the backup's contents, all or nothing. */
	public restoreBackup(backup: BackupFile): RestoreResult {
		const { groups } = backup.data;
		this.db.transaction((tx) => {
			tx.delete(itemsTable).run();
			tx.delete(groupsTable).run();
			groups.forEach((group, groupIndex) => {
				tx.insert(groupsTable)
					.values({
						id: group.id,
						title: group.title,
						description: group.description,
						sortOrder: groupIndex,
					})
					.run();
				group.items.forEach((item, index) => {
					tx.insert(itemsTable)
						.values({ ...item, groupId: group.id, sortOrder: index })
						.run();
				});
			});
		});

		return {
			success: true,
			message: "Backup restored successfully",
			groupsRestored: groups.length,
			itemsRestored: groups.reduce((sum, group) => sum + group.items.length, 0),
		};
	}
}
