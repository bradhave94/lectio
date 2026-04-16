import { ORPCError } from "@orpc/client";
import { addBooksToPlan, getBookById, getPlanBuilderData, getUserPlanById } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const inputSchema = z.object({
	planId: z.uuid(),
	books: z
		.array(
			z.object({
				bookId: z.int().positive(),
				chapterStart: z.number().int().min(1).optional().nullable(),
				chapterEnd: z.number().int().min(1).optional().nullable(),
			}),
		)
		.min(1)
		.max(66),
});

export const addPlanBooksProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/plans/{planId}/books",
		tags: ["Lectio"],
		summary: "Add one or more books to a plan",
		description:
			"Adds the given Bible books to a user-owned plan, optionally scoped to a chapter range. Existing entries are skipped.",
	})
	.input(inputSchema)
	.handler(async ({ input, context }) => {
		const plan = await getUserPlanById(input.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		// Validate every book and chapter range individually.
		for (const entry of input.books) {
			const book = await getBookById(entry.bookId);
			if (!book) {
				throw new ORPCError("NOT_FOUND", { message: `Book ${entry.bookId} not found.` });
			}

			if (entry.chapterStart != null || entry.chapterEnd != null) {
				if (entry.chapterStart == null || entry.chapterEnd == null) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Chapter scope requires both start and end.",
					});
				}
				if (entry.chapterEnd < entry.chapterStart) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Chapter end must be greater than or equal to chapter start.",
					});
				}
				if (entry.chapterEnd > book.chapterCount) {
					throw new ORPCError("BAD_REQUEST", {
						message: `Chapter ${entry.chapterEnd} exceeds ${book.name} chapter count (${book.chapterCount}).`,
					});
				}
			}
		}

		await addBooksToPlan({
			planId: input.planId,
			books: input.books.map((book) => ({
				bookId: book.bookId,
				chapterStart: book.chapterStart ?? null,
				chapterEnd: book.chapterEnd ?? null,
			})),
		});

		const builder = await getPlanBuilderData(input.planId);
		if (!builder) {
			throw new ORPCError("NOT_FOUND");
		}

		return builder;
	});
