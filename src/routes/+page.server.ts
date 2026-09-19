import { getConfig } from "#lib/server/config.ts";
import { monitoringService } from "#lib/server/monitoring/index.ts";
import { LayoutSettings } from "#lib/server/settings/layout-settings.ts";

export const load = async ({ depends, parent }) => {
	depends("app:monitoring");

	const { dashboard } = await parent();

	const config = getConfig();
	if (!config) {
		throw new Error("Failed to load configuration");
	}

	return {
		dashboard,
		layout: new LayoutSettings().get(),
		weather: monitoringService.getWeatherSnapshot(),
		system: monitoringService.getSystemSnapshot(),
		analytics: monitoringService.getAnalyticsSnapshot(),
		tasks: monitoringService.getTasksSnapshot(),
		ci: monitoringService.getCiSnapshot(),
		linkStatuses: monitoringService.getLinkStatuses(
			dashboard.groups.flatMap((group) => group.items.map((item) => item.url)),
		),
		uptime: monitoringService.getUptimeSnapshot(),
		config,
	};
};
