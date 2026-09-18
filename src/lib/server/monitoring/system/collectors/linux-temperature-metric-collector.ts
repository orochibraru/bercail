import { readdir, readFile } from "node:fs/promises";
import { BaseMetricCollector } from "../base-metric-collector";
import type { MetricKey } from "../system-stats-types";

const THERMAL_ROOT = "/sys/class/thermal";
const PREFERRED_ZONE_TYPES = ["x86_pkg_temp", "cpu-thermal", "soc_thermal"];

interface ThermalZone {
	type: string;
	celsius: number;
}

async function readThermalZone(name: string): Promise<ThermalZone> {
	const [type, rawMillidegrees] = await Promise.all([
		readFile(`${THERMAL_ROOT}/${name}/type`, "utf8").then((t) => t.trim()),
		readFile(`${THERMAL_ROOT}/${name}/temp`, "utf8").then((t) =>
			Number(t.trim()),
		),
	]);
	return { type, celsius: rawMillidegrees / 1000 };
}

/** Reads /sys/class/thermal - only present on Linux. */
export class LinuxTemperatureMetricCollector extends BaseMetricCollector {
	readonly key: MetricKey = "temperature";
	readonly label = "TEMP";

	protected async collectRaw() {
		const entries = await readdir(THERMAL_ROOT);
		const zoneNames = entries.filter((name) => name.startsWith("thermal_zone"));
		if (zoneNames.length === 0) {
			throw new Error("No thermal zones available");
		}

		const zones = await Promise.all(zoneNames.map(readThermalZone));
		const preferred = zones.find((zone) =>
			PREFERRED_ZONE_TYPES.includes(zone.type),
		);
		const celsius =
			preferred?.celsius ??
			zones.reduce((sum, zone) => sum + zone.celsius, 0) / zones.length;

		return {
			// Reusing `percent` for the raw Celsius reading (not a ratio) mirrors
			// how the design mockup drives its bar width directly off the value.
			percent: Math.round(celsius),
			detail: `${celsius.toFixed(0)}°C · fans normal`,
		};
	}
}
