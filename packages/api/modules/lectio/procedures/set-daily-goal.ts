import { setUserDailyGoal } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const setDailyGoalProcedure = protectedProcedure
	.route({
		method: "PATCH",
		path: "/lectio/stats/daily-goal",
		tags: ["Lectio"],
		summary: "Update daily reading goal",
		description: "Sets (or clears) the user's daily chapter goal. Pass null to clear.",
	})
	.input(
		z.object({
			dailyGoalChapters: z.number().int().min(1).max(150).nullable(),
		}),
	)
	.handler(async ({ input, context }) => {
		const goal = await setUserDailyGoal(context.user.id, input.dailyGoalChapters);
		return { goal };
	});
