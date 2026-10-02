import { Dashboard } from "#lib/server/dashboard.ts";
import { AppearanceSettings } from "#lib/server/settings/appearance-settings.ts";

export const load = () => {
	const dashboard = new Dashboard();
	return {
		dashboard: dashboard.getFullDashboard(),
		appearance: new AppearanceSettings().get(),
	};
};
