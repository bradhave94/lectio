import { listBooks } from "@repo/database";
import { z } from "zod";

import { publicProcedure } from "../../../orpc/procedures";

export const listBooksProcedure = publicProcedure
	.route({
		method: "GET",
		path: "/lectio/books",
		tags: ["Lectio"],
		summary: "List Bible books",
		description: "Returns all Bible books with optional testament and search filters.",
	})
	.input(
		z.object({
			testament: z.enum(["OT", "NT"]).optional(),
			search: z.string().trim().min(1).optional(),
		}),
	)
	.handler(async ({ input }) => {
		return listBooks({
			testament: input.testament,
			search: input.search,
		});
	});
