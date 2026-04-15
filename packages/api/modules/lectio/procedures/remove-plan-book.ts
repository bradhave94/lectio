import { ORPCError } from "@orpc/client";
import { getPlanBookById, removePlanBook } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const removePlanBookProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/lectio/plan-books/{planBookId}",
		tags: ["Lectio"],
		summary: "Remove a book from plan",
		description: "Removes a book from a user-owned Lectio plan.",
	})
	.input(
		z.object({
			planBookId: z.uuid(),
		}),
	)
	.handler(async ({ input, context }) => {
		const planBook = await getPlanBookById(input.planBookId);
		if (!planBook || planBook.plan.userId !== context.user.id) {
			throw new ORPCError("NOT_FOUND");
		}

		const deleted = await removePlanBook(planBook.id);

		if (!deleted) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			id: deleted.id,
		};
	});
