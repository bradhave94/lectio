import { ORPCError } from "@orpc/client";
import { getUserPlanById, listRecentReadingLogsForPlan } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listRecentPlanLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/plans/{planId}/reading-logs/recent",
		tags: ["Lectio"],
		summary: "List recent reading logs for a plan",
	})
	.input(
		z.object({
			planId: z.uuid(),
			limit: z.number().int().min(1).max(200).optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const plan = await getUserPlanById(input.planId, user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		return listRecentReadingLogsForPlan(input.planId, input.limit ?? 50);
	});
