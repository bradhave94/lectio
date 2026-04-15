import { ORPCError } from "@orpc/client";
import { getUserPlanById, listReadingLogsByPlanBook } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listReadingLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/plan-books/{planBookId}/reading-logs",
		tags: ["Lectio"],
		summary: "List reading logs for a plan book",
		description:
			"Returns reading logs for a plan book in reverse chronological order.",
	})
	.input(
		z.object({
			planBookId: z.uuid(),
			planId: z.uuid(),
		}),
	)
	.handler(async ({ input: { planBookId, planId }, context: { user } }) => {
		const plan = await getUserPlanById(planId, user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const logs = await listReadingLogsByPlanBook(planBookId);

		return logs;
	});
