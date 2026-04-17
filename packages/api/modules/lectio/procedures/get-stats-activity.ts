import { getReadingActivity } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getStatsActivityProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/stats/activity",
		tags: ["Lectio"],
		summary: "Reading activity per day",
		description:
			"Returns one entry per day in the requested window (defaults to the last year). Days with zero logs are filled in.",
	})
	.input(
		z.object({
			from: dateSchema.optional(),
			to: dateSchema.optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		return getReadingActivity(context.user.id, input);
	});
