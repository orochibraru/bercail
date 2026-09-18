import { spawnSync } from "node:child_process";

export interface ProcessResult {
	stdout: string;
	exitCode: number;
}

/** Injectable so collectors that shell out (df, nvidia-smi...) stay unit-testable. */
export type CommandRunner = (command: string, args: string[]) => ProcessResult;

export const defaultCommandRunner: CommandRunner = (command, args) => {
	const result = spawnSync(command, args, { encoding: "utf8" });
	return { stdout: result.stdout ?? "", exitCode: result.status ?? 1 };
};
