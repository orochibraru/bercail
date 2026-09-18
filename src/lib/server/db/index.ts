import "dotenv/config";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";

export const dbFileName = process.env.DB_FILE_NAME || "data/db.sqlite";

// Ensure the directory exists before creating the database
const dbDir = dirname(dbFileName);
mkdirSync(dbDir, { recursive: true });

export const sqlite = new Database(dbFileName);

// Enable foreign key constraints
sqlite.run("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite);
