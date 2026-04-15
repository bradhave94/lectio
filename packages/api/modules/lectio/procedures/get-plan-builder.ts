import { ORPCError } from "@orpc/client";
import { getPlanBuilderData, getUserPlanById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getPlanBuilderProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/plans/{planId}/builder",
		tags: ["Lectio"],
		summary: "Get plan builder data",
		description:
			"Returns plan metadata, ordered plan books, and summary stats for the builder page.",
	})
	.input(
		z.object({
			planId: z.uuid(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const plan = await getUserPlanById(input.planId, user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const builderData = await getPlanBuilderData(input.planId);

		if (!builderData) {
			throw new ORPCError("NOT_FOUND");
		}

		return builderData;
	});
