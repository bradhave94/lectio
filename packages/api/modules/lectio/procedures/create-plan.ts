import { createPlan as createPlanFn } from "@repo/database";
import { z } from "zod";

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
		}),
	)
	.handler(async ({ input, context }) => {
		const created = await createPlanFn({
			userId: context.user.id,
			title: input.title,
			description: input.description ?? null,
		});

		return created;
	});
