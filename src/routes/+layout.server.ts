import { Dashboard } from "#lib/server/dashboard.ts";

export const load = () => {
	const dashboard = new Dashboard();
	return {
		dashboard: dashboard.getFullDashboard(),
	};
};
