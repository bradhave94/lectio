import { addBooksToPlan, createPlan as createPlanFn } from "@repo/database";
import { z } from "zod";

import { planColorSchema, planDateSchema, planIconSchema } from "../lib/schemas";
import { protectedProcedure } from "../../../orpc/procedures";

export const createPlanProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/plans",
		tags: ["Lectio"],
		summary: "Create Bible reading plan",
		description: "Creates a new custom Bible reading plan for the current user",
	})
	.input(
		z.object({
			title: z.string().trim().min(1).max(160),
			description: z.string().trim().max(2000).optional().nullable(),
			color: planColorSchema.optional().nullable(),
			icon: planIconSchema.optional().nullable(),
			startDate: planDateSchema.optional().nullable(),
			targetEndDate: planDateSchema.optional().nullable(),
			cadence: z.string().trim().max(80).optional().nullable(),
			books: z
				.array(
					z.object({
						bookId: z.int().positive(),
						chapterStart: z.number().int().min(1).optional().nullable(),
						chapterEnd: z.number().int().min(1).optional().nullable(),
					}),
				)
				.max(66)
				.optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const created = await createPlanFn({
			userId: context.user.id,
			title: input.title,
			description: input.description ?? null,
			color: input.color ?? null,
			icon: input.icon ?? null,
			startDate: input.startDate ?? null,
			targetEndDate: input.targetEndDate ?? null,
			cadence: input.cadence ?? null,
		});

		if (input.books?.length) {
			await addBooksToPlan({
				planId: created.id,
				books: input.books.map((book) => ({
					bookId: book.bookId,
					chapterStart: book.chapterStart ?? null,
					chapterEnd: book.chapterEnd ?? null,
				})),
			});
		}

		return created;
	});
