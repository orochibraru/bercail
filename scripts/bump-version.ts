#!/usr/bin/env bun
import process from "node:process";

const nextVersion = process.argv[2];
if (!nextVersion) {
	console.error("Usage: bun scripts/bump-version.ts <version>");
	process.exit(1);
}

const packageJson = await Bun.file("package.json").json();
packageJson.version = nextVersion;
await Bun.write("package.json", `${JSON.stringify(packageJson, null, "\t")}\n`);
console.log(`Bumped package.json to ${nextVersion}`);
