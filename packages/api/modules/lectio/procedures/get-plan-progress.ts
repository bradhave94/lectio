import { ORPCError } from "@orpc/client";
import { getPlanProgressData, getUserPlanById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getPlanProgressProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/plans/{planId}/progress",
		tags: ["Lectio"],
		summary: "Get plan progress view data",
		description:
			"Returns aggregate and per-book progress information for a user-owned plan.",
	})
	.input(
		z.object({
			planId: z.uuid(),
		}),
	)
	.handler(async ({ input, context }) => {
		const plan = await getUserPlanById(input.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const data = await getPlanProgressData(plan.id);
		if (!data) {
			throw new ORPCError("NOT_FOUND");
		}

		return data;
	});
