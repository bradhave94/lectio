import { ORPCError } from "@orpc/client";
import { getUserPlanById, updatePlan, type UpdatePlanChanges } from "@repo/database";
import { z } from "zod";

import { planColorSchema, planDateSchema, planIconSchema } from "../lib/schemas";
import { protectedProcedure } from "../../../orpc/procedures";

const updatePlanInputSchema = z.object({
	planId: z.uuid(),
	title: z.string().trim().min(1).max(160).optional(),
	description: z.string().trim().max(2000).nullable().optional(),
	color: planColorSchema.nullable().optional(),
	icon: planIconSchema.nullable().optional(),
	startDate: planDateSchema.nullable().optional(),
	targetEndDate: planDateSchema.nullable().optional(),
	cadence: z.string().trim().max(80).nullable().optional(),
	archived: z.boolean().optional(),
});

export const updatePlanProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/plans/{planId}",
		tags: ["Lectio"],
		summary: "Update a user plan",
		description: "Updates plan basics, styling, schedule, or archive state.",
	})
	.input(updatePlanInputSchema)
	.handler(async ({ input, context: { user } }) => {
		const existingPlan = await getUserPlanById(input.planId, user.id);
		if (!existingPlan) {
			throw new ORPCError("NOT_FOUND");
		}

		const changes: UpdatePlanChanges = {};
		if (input.title !== undefined) changes.title = input.title;
		if (input.description !== undefined) changes.description = input.description;
		if (input.color !== undefined) changes.color = input.color;
		if (input.icon !== undefined) changes.icon = input.icon;
		if (input.startDate !== undefined) changes.startDate = input.startDate;
		if (input.targetEndDate !== undefined) changes.targetEndDate = input.targetEndDate;
		if (input.cadence !== undefined) changes.cadence = input.cadence;
		if (input.archived !== undefined) {
			changes.archivedAt = input.archived ? new Date() : null;
		}

		if (Object.keys(changes).length === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "At least one field must be provided to update a plan.",
			});
		}

		const updated = await updatePlan(input.planId, user.id, changes);

		if (!updated) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}

		return updated;
	});
