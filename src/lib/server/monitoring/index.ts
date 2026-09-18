import { MonitoringService } from "./monitoring-service";

export const monitoringService = MonitoringService.fromEnv();

export type { DashboardSnapshot } from "./monitoring-service";
export { MonitoringService } from "./monitoring-service";
