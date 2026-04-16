import { listUserPlansWithSummary } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listPlansProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/plans",
		tags: ["Lectio"],
		summary: "List current user's Lectio plans",
	})
	.input(
		z.object({
			includeArchived: z.boolean().optional(),
		}),
	)
	.handler(async ({ context: { user } }) => {
		return listUserPlansWithSummary(user.id);
	});
