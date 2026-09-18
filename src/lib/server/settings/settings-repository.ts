import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { db } from "#lib/server/db/index.ts";
import { settingsTable } from "#lib/server/db/schema.ts";

/** Generic key-value store for small persisted app settings. */
export class SettingsRepository {
	private db: BunSQLiteDatabase<Record<string, unknown>>;

	constructor(database?: BunSQLiteDatabase<Record<string, unknown>>) {
		this.db = database ?? db;
	}

	get(key: string): string | null {
		const row = this.db
			.select()
			.from(settingsTable)
			.where(eq(settingsTable.key, key))
			.get();
		return row?.value ?? null;
	}

	set(key: string, value: string): void {
		this.db
			.insert(settingsTable)
			.values({ key, value })
			.onConflictDoUpdate({ target: settingsTable.key, set: { value } })
			.run();
	}

	delete(key: string): void {
		this.db.delete(settingsTable).where(eq(settingsTable.key, key)).run();
	}
}
