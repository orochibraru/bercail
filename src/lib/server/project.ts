import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

export function getProjectVersion(): string {
	try {
		// Resolve the path to package.json from the current working directory
		const packageJsonPath = resolve(cwd(), "package.json");

		// Read the file's contents as a UTF-8 string
		const fileContent = readFileSync(packageJsonPath, "utf8");

		// Parse the JSON string into an object
		const packageJson = JSON.parse(fileContent);

		// Return the version property
		return packageJson.version;
	} catch (error) {
		// Log an error if the file can't be read, parsed, or the version is missing
		console.error("Error reading version from package.json:", error);
		return "1.0.0";
	}
}
