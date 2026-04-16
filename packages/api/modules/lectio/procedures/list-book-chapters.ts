import { ORPCError } from "@orpc/client";
import { getBookById, listBookChapters } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const listBookChaptersProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/lectio/books/{bookId}/chapters",
		tags: ["Lectio"],
		summary: "List chapters for a Bible book",
	})
	.input(
		z.object({
			bookId: z.number().int().positive(),
		}),
	)
	.handler(async ({ input }) => {
		const book = await getBookById(input.bookId);
		if (!book) {
			throw new ORPCError("NOT_FOUND");
		}

		const chapters = await listBookChapters(input.bookId);
		return {
			book: {
				id: book.id,
				usfmCode: book.usfmCode,
				name: book.name,
				chapterCount: book.chapterCount,
			},
			chapters: chapters.map((chapter) => ({
				id: chapter.id,
				chapterNum: chapter.chapterNum,
				verseCount: chapter.verseCount,
			})),
		};
	});
