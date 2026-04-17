import { getReadingStreak } from "@repo/database";

import { protectedProcedure } from "../../../orpc/procedures";

export const getStatsStreakProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/stats/streak",
		tags: ["Lectio"],
		summary: "Reading streak",
		description: "Returns the current and longest consecutive-day reading streak for the user.",
	})
	.handler(async ({ context }) => {
		return getReadingStreak(context.user.id);
	});
