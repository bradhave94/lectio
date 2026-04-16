import { ORPCError } from "@orpc/client";
import {
	getPlanBookById,
	recomputePlanBookStatus,
	updatePlanBook,
	type UpdatePlanBookChanges,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { planStatusSchema } from "../lib/schemas";

const updatePlanBookInputSchema = z
	.object({
		planBookId: z.uuid(),
		notes: z.string().max(5_000).nullable().optional(),
		status: planStatusSchema.optional(),
		statusManual: z.boolean().optional(),
		chapterStart: z.number().int().min(1).max(150).nullable().optional(),
		chapterEnd: z.number().int().min(1).max(150).nullable().optional(),
		clearChapterScope: z.boolean().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.chapterStart != null && value.chapterEnd != null) {
			if (value.chapterEnd < value.chapterStart) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Chapter end must be greater than or equal to chapter start",
					path: ["chapterEnd"],
				});
			}
		}
	});

function normalizeOptionalText(value: string | null | undefined) {
	if (value === undefined) return undefined;
	if (value === null) return null;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

export const updatePlanBookProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/plan-books/{planBookId}",
		tags: ["Lectio"],
		summary: "Update a plan book",
		description: "Updates chapter scope, notes, and status for a plan book.",
	})
	.input(updatePlanBookInputSchema)
	.handler(async ({ input, context }) => {
		const current = await getPlanBookById(input.planBookId);
		if (!current || current.plan.userId !== context.user.id) {
			throw new ORPCError("NOT_FOUND");
		}

		const changes: UpdatePlanBookChanges = {};

		if (input.notes !== undefined) {
			changes.notes = normalizeOptionalText(input.notes);
		}

		if (input.clearChapterScope) {
			changes.chapterStart = null;
			changes.chapterEnd = null;
		} else {
			if (input.chapterStart !== undefined) changes.chapterStart = input.chapterStart;
			if (input.chapterEnd !== undefined) changes.chapterEnd = input.chapterEnd;
		}

		// Validate chapter scope against the book's chapter count.
		const nextStart =
			changes.chapterStart !== undefined ? changes.chapterStart : current.chapterStart;
		const nextEnd = changes.chapterEnd !== undefined ? changes.chapterEnd : current.chapterEnd;
		if (nextStart != null || nextEnd != null) {
			if (nextStart == null || nextEnd == null) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Chapter scope requires both start and end.",
				});
			}
			if (nextEnd > current.book.chapterCount) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Chapter ${nextEnd} exceeds ${current.book.name} chapter count (${current.book.chapterCount}).`,
				});
			}
		}

		const userIsSettingManual = input.statusManual === true;
		const userIsClearingManual = input.statusManual === false;
		const nextManual = input.statusManual ?? current.statusManual;

		if (input.statusManual !== undefined) {
			changes.statusManual = input.statusManual;
		}

		if (input.status !== undefined && (userIsSettingManual || nextManual)) {
			// User is setting status with manual override — persist it directly.
			const now = new Date();
			changes.status = input.status;
			if (input.status === "not_started") {
				changes.startedAt = null;
				changes.completedAt = null;
			} else {
				changes.startedAt = current.startedAt ?? now;
				changes.completedAt = input.status === "completed" ? (current.completedAt ?? now) : null;
			}
		}

		const hasChanges = Object.keys(changes).length > 0;
		const updated = hasChanges ? await updatePlanBook(input.planBookId, changes) : current;
		if (!updated) {
			throw new ORPCError("NOT_FOUND");
		}

		// If the user has cleared manual control or merely changed scope/notes,
		// recompute the auto-status to keep things consistent.
		if (
			userIsClearingManual ||
			(input.status === undefined && !nextManual) ||
			input.chapterStart !== undefined ||
			input.chapterEnd !== undefined ||
			input.clearChapterScope
		) {
			await recomputePlanBookStatus(input.planBookId);
		}

		return updated;
	});
