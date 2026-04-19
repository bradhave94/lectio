import { listRecentReadingLogsForUser } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listRecentUserLogsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/reading-logs/recent",
		tags: ["Lectio"],
		summary: "List recent reading logs across all of the current user's plans",
		description:
			"Returns recent reading logs across the user's plans. When `search` is provided, runs a Postgres full-text query against the note tsvector column and case-insensitive matches against book + plan titles.",
	})
	.input(
		z.object({
			limit: z.number().int().min(1).max(200).optional(),
			search: z.string().trim().max(200).optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		return listRecentReadingLogsForUser(user.id, {
			limit: input.limit ?? 50,
			search: input.search,
		});
	});
