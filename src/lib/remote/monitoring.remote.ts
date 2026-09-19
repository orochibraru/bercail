import { z } from "zod";
import { monitoringService } from "#lib/server/monitoring/index.ts";
import { CACHED_SECTIONS } from "#lib/server/monitoring/monitoring-service.ts";
import { command } from "$app/server";

export const clearSectionCache = command(z.enum(CACHED_SECTIONS), (section) => {
	monitoringService.clearCache(section);
});
