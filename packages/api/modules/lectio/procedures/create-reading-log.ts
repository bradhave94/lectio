import { ORPCError } from "@orpc/client";
import {
	createReadingLog,
	getBookChapter,
	getPlanBookById,
	getUserPlanById,
} from "@repo/database";
import { z } from "zod";

import { validateReadingLogInput } from "../lib/reading-log";
import { protectedProcedure } from "../../../orpc/procedures";

export const createReadingLogProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/reading-logs",
		tags: ["Lectio"],
		summary: "Create reading log",
		description: "Creates a chapter/verse structured reading log for a plan book.",
	})
	.input(
		z.object({
			planBookId: z.uuid(),
			chapter: z.number().int().min(1),
			verseStart: z.number().int().min(1).optional(),
			verseEnd: z.number().int().min(1).optional(),
			note: z.string().max(5000).optional(),
			loggedAt: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const planBook = await getPlanBookById(input.planBookId);
		if (!planBook) {
			throw new ORPCError("NOT_FOUND");
		}

		const plan = await getUserPlanById(planBook.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		const chapter = await getBookChapter(planBook.bookId, input.chapter);
		if (!chapter) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Invalid chapter for this book.",
			});
		}

		const validation = validateReadingLogInput({
			chapter: input.chapter,
			verseStart: input.verseStart ?? null,
			verseEnd: input.verseEnd ?? null,
			maxVerseInChapter: chapter.verseCount,
		});

		if (!validation.isValid) {
			throw new ORPCError("BAD_REQUEST", {
				message: validation.reason,
			});
		}

		const created = await createReadingLog({
			planBookId: input.planBookId,
			chapterStart: input.chapter,
			chapterEnd: input.chapter,
			verseStart: input.verseStart ?? null,
			verseEnd: input.verseEnd ?? null,
			note: input.note ?? null,
			loggedAt: input.loggedAt,
		});

		return created;
	});
