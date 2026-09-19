export const DUE_PRESETS = [
	{ value: "tomorrow", label: "Tomorrow at 9" },
	{ value: "next-week", label: "Next week" },
	{ value: "next-weekend", label: "Next weekend" },
] as const;
export type DuePreset = (typeof DUE_PRESETS)[number]["value"];

const MONDAY = 1;
const SATURDAY = 6;

function daysUntil(weekday: number, from: Date): number {
	return (weekday - from.getDay() + 7) % 7 || 7;
}

/** Local 9:00 on tomorrow, the coming Monday or the coming Saturday. */
export function presetDate(preset: DuePreset, now = new Date()): Date {
	const days =
		preset === "tomorrow"
			? 1
			: daysUntil(preset === "next-week" ? MONDAY : SATURDAY, now);
	return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9);
}
