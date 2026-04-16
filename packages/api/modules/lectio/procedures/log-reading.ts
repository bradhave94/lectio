import { ORPCError } from "@orpc/client";
import { randomUUID } from "node:crypto";

import {
	createReadingLogsBatch,
	getBookChapter,
	getPlanBookById,
	getUserPlanById,
	recomputePlanBookStatus,
} from "@repo/database";
import { z } from "zod";

import { chapterRangeSchema } from "../lib/schemas";
import { protectedProcedure } from "../../../orpc/procedures";

const inputSchema = z
	.object({
		planId: z.uuid(),
		planBookId: z.uuid(),
		chapters: z.array(chapterRangeSchema).min(1).max(150),
		verseStart: z.number().int().min(1).optional().nullable(),
		verseEnd: z.number().int().min(1).optional().nullable(),
		note: z.string().max(5000).optional().nullable(),
		loggedAt: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
	})
	.superRefine((value, ctx) => {
		if ((value.verseStart ?? null) === null && (value.verseEnd ?? null) === null) {
			return;
		}

		if ((value.verseStart ?? null) === null || (value.verseEnd ?? null) === null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Both verse start and verse end must be provided.",
				path: ["verseStart"],
			});
			return;
		}

		if ((value.verseEnd as number) < (value.verseStart as number)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Verse end must be greater than or equal to verse start.",
				path: ["verseEnd"],
			});
		}

		// Verses only make sense for a single chapter.
		const isSingleChapter =
			value.chapters.length === 1 && value.chapters[0].start === value.chapters[0].end;
		if (!isSingleChapter) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Verse range only applies when a single chapter is selected.",
				path: ["verseStart"],
			});
		}
	});

export const logReadingProcedure = protectedProcedure
	.route({
		method: "POST",
		path: "/lectio/plans/{planId}/reading-logs",
		tags: ["Lectio"],
		summary: "Log reading entries",
		description:
			"Records one or more reading entries (chapter ranges) for a plan book in a single submission.",
	})
	.input(inputSchema)
	.handler(async ({ input, context }) => {
		const planBook = await getPlanBookById(input.planBookId);
		if (!planBook || planBook.planId !== input.planId) {
			throw new ORPCError("NOT_FOUND");
		}

		const plan = await getUserPlanById(planBook.planId, context.user.id);
		if (!plan) {
			throw new ORPCError("NOT_FOUND");
		}

		// Validate every chapter range against the book's chapter count and
		// against the plan_book's chapter scope (if any).
		const minScope = planBook.chapterStart ?? 1;
		const maxScope = planBook.chapterEnd ?? planBook.book.chapterCount;

		for (const range of input.chapters) {
			if (range.start > planBook.book.chapterCount || range.end > planBook.book.chapterCount) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Chapter range ${range.start}-${range.end} exceeds ${planBook.book.name} chapter count (${planBook.book.chapterCount}).`,
				});
			}

			if (range.start < minScope || range.end > maxScope) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Chapter range ${range.start}-${range.end} is outside this plan's scope (${minScope}-${maxScope}).`,
				});
			}
		}

		// If a verse range is provided, validate against the chapter's verse count.
		if (input.verseStart != null && input.verseEnd != null) {
			const chapter = await getBookChapter(planBook.bookId, input.chapters[0].start);
			if (!chapter) {
				throw new ORPCError("BAD_REQUEST", { message: "Invalid chapter for this book." });
			}
			if (input.verseStart > chapter.verseCount || input.verseEnd > chapter.verseCount) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Verse range exceeds chapter verse count (${chapter.verseCount}).`,
				});
			}
		}

		const submissionId = randomUUID();

		const created = await createReadingLogsBatch({
			planBookId: input.planBookId,
			submissionId,
			entries: input.chapters.map((range) => ({
				chapterStart: range.start,
				chapterEnd: range.end,
				verseStart: input.verseStart ?? null,
				verseEnd: input.verseEnd ?? null,
			})),
			note: input.note ?? null,
			loggedAt: input.loggedAt,
		});

		const planBookAfter = await recomputePlanBookStatus(input.planBookId);

		return {
			submissionId,
			logs: created,
			planBook: planBookAfter,
		};
	});
