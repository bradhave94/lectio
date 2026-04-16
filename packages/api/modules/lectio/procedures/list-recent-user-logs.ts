import { listRecentReadingLogsForUser } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listRecentUserLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/reading-logs/recent",
		tags: ["Lectio"],
		summary: "List recent reading logs across all of the current user's plans",
	})
	.input(
		z.object({
			limit: z.number().int().min(1).max(200).optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		return listRecentReadingLogsForUser(user.id, input.limit ?? 50);
	});
