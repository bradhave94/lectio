import { ORPCError } from "@orpc/client";
import { getUserPlanById, listPlanBookIdsInOrder, reorderPlanBooks } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const reorderPlanBooksProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/plans/{planId}/books/reorder",
		tags: ["Lectio"],
		summary: "Reorder books in plan",
		description: "Rewrites all order indexes for books in a user-owned plan.",
	})
	.input(
		z.object({
			planId: z.uuid(),
			orderedPlanBookIds: z.array(z.uuid()).min(1),
		}),
	)
	.handler(async ({ input, context }) => {
		const plan = await getUserPlanById(input.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const currentIds = await listPlanBookIdsInOrder(plan.id);
		const uniqueIncoming = Array.from(new Set(input.orderedPlanBookIds));

		if (uniqueIncoming.length !== currentIds.length) {
			throw new ORPCError("BAD_REQUEST");
		}

		const currentSet = new Set(currentIds);
		const incomingSet = new Set(uniqueIncoming);
		const hasMismatch =
			currentSet.size !== incomingSet.size || currentIds.some((id) => !incomingSet.has(id));

		if (hasMismatch) {
			throw new ORPCError("BAD_REQUEST");
		}

		await reorderPlanBooks(plan.id, uniqueIncoming);

		return {
			planId: plan.id,
			orderedPlanBookIds: uniqueIncoming,
		};
	});
