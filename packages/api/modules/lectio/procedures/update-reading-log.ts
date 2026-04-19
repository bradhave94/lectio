import { ORPCError } from "@orpc/client";
import {
	getBookChapter,
	getPlanBookById,
	getReadingLogById,
	recomputePlanBookStatus,
	updateReadingLog,
	type UpdateReadingLogChanges,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const inputSchema = z
	.object({
		readingLogId: z.uuid(),
		planBookId: z.uuid().optional(),
		chapterStart: z.number().int().min(1).max(150).optional(),
		chapterEnd: z.number().int().min(1).max(150).optional(),
		verseStart: z.number().int().min(1).nullable().optional(),
		verseEnd: z.number().int().min(1).nullable().optional(),
		note: z.string().max(5000).nullable().optional(),
		loggedAt: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
	})
	.superRefine((value, ctx) => {
		if (value.chapterStart !== undefined && value.chapterEnd !== undefined) {
			if (value.chapterEnd < value.chapterStart) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Chapter end must be greater than or equal to chapter start.",
					path: ["chapterEnd"],
				});
			}
		}

		const verseStart = value.verseStart ?? null;
		const verseEnd = value.verseEnd ?? null;
		if (verseStart === null && verseEnd === null) {
			return;
		}

		if (verseStart === null || verseEnd === null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Both verse start and verse end must be provided, or both omitted.",
				path: ["verseStart"],
			});
			return;
		}

		if ((verseEnd as number) < (verseStart as number)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Verse end must be greater than or equal to verse start.",
				path: ["verseEnd"],
			});
		}
	});

function normalizeOptionalText(value: string | null | undefined) {
	if (value === undefined) return undefined;
	if (value === null) return null;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

/**
 * Edit a single reading-log entry. Supports moving the entry to a different
 * plan-book (within the same user's plans) and updating chapter range,
 * verse range, note, or date.
 *
 * After the write we recompute auto-status for both the source plan-book
 * and the destination plan-book so completion counts stay accurate.
 */
export const updateReadingLogProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/reading-logs/{readingLogId}",
		tags: ["Lectio"],
		summary: "Update a reading log entry",
		description:
			"Edits a reading log entry. Supports moving it to a different plan-book and changing chapter/verse range, note, or date.",
	})
	.input(inputSchema)
	.handler(async ({ input, context }) => {
		const existing = await getReadingLogById(input.readingLogId);
		if (!existing || existing.planBook.plan.userId !== context.user.id) {
			throw new ORPCError("NOT_FOUND");
		}

		// Resolve the destination plan-book (defaults to the existing one).
		const destinationPlanBook =
			input.planBookId && input.planBookId !== existing.planBookId
				? await getPlanBookById(input.planBookId)
				: existing.planBook;

		if (!destinationPlanBook || destinationPlanBook.plan.userId !== context.user.id) {
			throw new ORPCError("NOT_FOUND");
		}

		const nextChapterStart = input.chapterStart ?? existing.chapterStart;
		const nextChapterEnd = input.chapterEnd ?? existing.chapterEnd;

		// Validate chapter range against destination plan-book's bounds.
		const minScope = destinationPlanBook.chapterStart ?? 1;
		const maxScope = destinationPlanBook.chapterEnd ?? destinationPlanBook.book.chapterCount;

		if (
			nextChapterStart > destinationPlanBook.book.chapterCount ||
			nextChapterEnd > destinationPlanBook.book.chapterCount
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Chapter range ${nextChapterStart}-${nextChapterEnd} exceeds ${destinationPlanBook.book.name} chapter count (${destinationPlanBook.book.chapterCount}).`,
			});
		}

		if (nextChapterStart < minScope || nextChapterEnd > maxScope) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Chapter range ${nextChapterStart}-${nextChapterEnd} is outside the destination plan's scope (${minScope}-${maxScope}).`,
			});
		}

		// Validate verse range against the chapter's verse count when provided.
		const nextVerseStart = input.verseStart === undefined ? existing.verseStart : input.verseStart;
		const nextVerseEnd = input.verseEnd === undefined ? existing.verseEnd : input.verseEnd;

		if (nextVerseStart !== null && nextVerseEnd !== null) {
			if (nextChapterStart !== nextChapterEnd) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Verse range only applies when the entry covers a single chapter.",
				});
			}
			const chapter = await getBookChapter(destinationPlanBook.bookId, nextChapterStart);
			if (!chapter) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Chapter not found for this book.",
				});
			}
			if (nextVerseStart > chapter.verseCount || nextVerseEnd > chapter.verseCount) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Verse range exceeds chapter verse count (${chapter.verseCount}).`,
				});
			}
		}

		const changes: UpdateReadingLogChanges = {};
		if (input.planBookId !== undefined && input.planBookId !== existing.planBookId) {
			changes.planBookId = input.planBookId;
		}
		if (input.chapterStart !== undefined) changes.chapterStart = input.chapterStart;
		if (input.chapterEnd !== undefined) changes.chapterEnd = input.chapterEnd;
		if (input.verseStart !== undefined) changes.verseStart = input.verseStart;
		if (input.verseEnd !== undefined) changes.verseEnd = input.verseEnd;
		if (input.note !== undefined) changes.note = normalizeOptionalText(input.note);
		if (input.loggedAt !== undefined) changes.loggedAt = input.loggedAt;

		const updated =
			Object.keys(changes).length > 0
				? await updateReadingLog(input.readingLogId, changes)
				: existing;
		if (!updated) {
			throw new ORPCError("NOT_FOUND");
		}

		// Recompute status for both source and (if moved) destination plan-books.
		await recomputePlanBookStatus(existing.planBookId);
		if (changes.planBookId && changes.planBookId !== existing.planBookId) {
			await recomputePlanBookStatus(changes.planBookId);
		}

		return updated;
	});
