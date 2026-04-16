import { ORPCError } from "@orpc/client";
import { getPlanBookById, updatePlanBook } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const planBookStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
const resourceTypeSchema = z.enum([
	"reading_plan",
	"video",
	"podcast",
	"book",
	"article",
	"other",
]);

const updatePlanBookInputSchema = z.object({
	planBookId: z.uuid(),
	resourceUrl: z.string().trim().url().nullable().optional(),
	resourceLabel: z.string().trim().max(200).nullable().optional(),
	resourceType: resourceTypeSchema.nullable().optional(),
	notes: z.string().max(5_000).nullable().optional(),
	status: planBookStatusSchema.optional(),
});

function normalizeOptionalText(value: string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

export const updatePlanBookProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/plan-books/{planBookId}",
		tags: ["Lectio"],
		summary: "Update a plan book",
		description: "Updates resource metadata, notes, and status for a plan book.",
	})
	.input(updatePlanBookInputSchema)
	.handler(async ({ input, context }) => {
		const current = await getPlanBookById(input.planBookId);

		if (!current || current.plan.userId !== context.user.id) {
			throw new ORPCError("NOT_FOUND");
		}

		const nextStatus = input.status ?? current.status;
		const now = new Date();

		const startedAt = (() => {
			if (nextStatus === "in_progress" || nextStatus === "completed") {
				return current.startedAt ?? now;
			}

			return current.startedAt;
		})();

		const completedAt = (() => {
			if (nextStatus === "completed") {
				return current.completedAt ?? now;
			}

			if (nextStatus !== "completed") {
				return null;
			}

			return current.completedAt;
		})();

		const updated = await updatePlanBook(input.planBookId, {
			resourceUrl: normalizeOptionalText(input.resourceUrl),
			resourceLabel: normalizeOptionalText(input.resourceLabel),
			resourceType: input.resourceType,
			notes: normalizeOptionalText(input.notes),
			status: input.status,
			startedAt,
			completedAt,
		});

		if (!updated) {
			throw new ORPCError("NOT_FOUND");
		}

		return updated;
	});
