import { Log } from "@kitql/helpers";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "#lib/server/db/index.ts";

const logger = new Log("Migrations");

export const migrateDatabase = () => {
	// Check db file existence and run migrations
	try {
		logger.info("Running database migrations...");
		migrate(db, { migrationsFolder: "./drizzle" });
		logger.success("Database migrations completed successfully.");
	} catch (error) {
		// Fail fast: a swallowed failure here (a read-only data volume, for
		// instance) only resurfaces later as an opaque write error.
		logger.error("Migration failed:", error);
		throw error;
	}
};
