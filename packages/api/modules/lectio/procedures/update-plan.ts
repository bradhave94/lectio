import { ORPCError } from "@orpc/client";
import { getUserPlanById, updatePlan } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const updatePlanProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/plans/{planId}",
		tags: ["Lectio"],
		summary: "Update a user plan",
		description: "Updates a plan title and/or description for the current user",
	})
	.input(
		z.object({
			planId: z.uuid(),
			title: z
				.string()
				.trim()
				.min(1)
				.max(120)
				.optional(),
			description: z
				.string()
				.trim()
				.max(2000)
				.nullable()
				.optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const existingPlan = await getUserPlanById(input.planId, user.id);
		if (!existingPlan) {
			throw new ORPCError("NOT_FOUND");
		}

		if (input.title === undefined && input.description === undefined) {
			throw new ORPCError("BAD_REQUEST", {
				message: "At least one field must be provided to update a plan.",
			});
		}

		const updated = await updatePlan(input.planId, user.id, {
			title: input.title,
			description: input.description,
		});

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}

		return updated;
	});
