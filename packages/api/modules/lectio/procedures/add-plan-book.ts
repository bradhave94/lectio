import { ORPCError } from "@orpc/client";
import {
	addBookToPlan,
	getBookById,
	getNextPlanBookOrder,
	getPlanBookByPlanAndBook,
	getPlanBuilderData,
	getUserPlanById,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const addPlanBookProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/plans/{planId}/books",
		tags: ["Lectio"],
		summary: "Add a book to plan",
		description: "Adds a bible book to a user-owned Lectio plan.",
	})
	.input(
		z.object({
			planId: z.uuid(),
			bookId: z.int().positive(),
		}),
	)
	.handler(async ({ input, context }) => {
		const plan = await getUserPlanById(input.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const book = await getBookById(input.bookId);
		if (!book) {
			throw new ORPCError("NOT_FOUND");
		}

		const existing = await getPlanBookByPlanAndBook(input.planId, input.bookId);
		if (existing) {
			throw new ORPCError("CONFLICT");
		}

		const nextOrderIndex = await getNextPlanBookOrder(input.planId);
		await addBookToPlan({
			planId: input.planId,
			bookId: input.bookId,
			orderIndex: nextOrderIndex,
		});

		const builder = await getPlanBuilderData(input.planId);
		if (!builder) {
			throw new ORPCError("NOT_FOUND");
		}

		return builder;
	});
