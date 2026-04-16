import { ORPCError } from "@orpc/client";
import {
	deleteReadingLog,
	getReadingLogById,
	recomputePlanBookStatus,
} from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const deleteReadingLogProcedure = protectedProcedure
	.route({
		method: "DELETE",
		path: "/lectio/reading-logs/{readingLogId}",
		tags: ["Lectio"],
		summary: "Delete reading log entry",
		description: "Deletes a reading log entry owned by the current user.",
	})
	.input(
		z.object({
			readingLogId: z.uuid(),
		}),
	)
	.handler(async ({ input, context }) => {
		const log = await getReadingLogById(input.readingLogId);
		if (!log) {
			throw new ORPCError("NOT_FOUND");
		}

		if (log.planBook.plan.userId !== context.user.id) {
			throw new ORPCError("FORBIDDEN");
		}

		const deleted = await deleteReadingLog(input.readingLogId);
		if (!deleted) {
			throw new ORPCError("NOT_FOUND");
		}

		await recomputePlanBookStatus(log.planBookId);

		return {
			id: deleted.id,
			planBookId: log.planBookId,
		};
	});
