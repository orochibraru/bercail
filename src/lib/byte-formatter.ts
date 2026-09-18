const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/** Formats a byte count as a human string, e.g. 20961761689.6 -> "19.5GB". */
// biome-ignore lint/complexity/noStaticOnlyClass: kept as a class namespace to match this module's OOP style
export class ByteFormatter {
	static format(bytes: number, decimals = 1): string {
		if (bytes <= 0) {
			return "0B";
		}

		const exponent = Math.min(
			Math.floor(Math.log(bytes) / Math.log(1024)),
			UNITS.length - 1,
		);
		const value = bytes / 1024 ** exponent;

		return `${value.toFixed(exponent === 0 ? 0 : decimals)}${UNITS[exponent]}`;
	}
}
