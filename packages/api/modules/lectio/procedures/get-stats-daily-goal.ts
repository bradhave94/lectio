import { getChaptersLoggedToday, getUserDailyGoal } from "@repo/database";

import { protectedProcedure } from "../../../orpc/procedures";

function todayIso() {
	const now = new Date();
	const year = now.getFullYear();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export const getStatsDailyGoalProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/stats/daily-goal",
		tags: ["Lectio"],
		summary: "Daily reading goal + today's progress",
	})
	.handler(async ({ context }) => {
		const [goal, today] = await Promise.all([
			getUserDailyGoal(context.user.id),
			getChaptersLoggedToday(context.user.id, todayIso()),
		]);

		return { goal, today };
	});
