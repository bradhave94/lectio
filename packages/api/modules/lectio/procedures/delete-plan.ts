import { ORPCError } from "@orpc/client";
import { deletePlan } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const deletePlanProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/lectio/plans/{planId}",
		tags: ["Lectio"],
		summary: "Delete a plan",
		description: "Deletes a user-owned Lectio reading plan.",
	})
	.input(
		z.object({
			planId: z.uuid(),
		}),
	)
	.handler(async ({ input: { planId }, context: { user } }) => {
		const deleted = await deletePlan(planId, user.id);

		if (!deleted) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			id: deleted.id,
		};
	});
