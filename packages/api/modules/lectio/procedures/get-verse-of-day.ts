import { publicProcedure } from "../../../orpc/procedures";
import { getPassageContent, getYouVersionVerseOfDay } from "../lib/youversion";

export const getVerseOfDayProcedure = publicProcedure
	.route({
		method: "GET",
		path: "/lectio/verse-of-day",
		tags: ["Lectio"],
		summary: "Get Verse of the Day",
		description:
			"Fetches today's verse of the day metadata + verse content from YouVersion and returns Bible.com deep links.",
	})
	.handler(async () => {
		try {
			const verse = await getYouVersionVerseOfDay();

			if (!verse) {
				return null;
			}

			const chapter = `${verse.usfmCode}.${verse.chapter}`;
			const bibleDotComUrl = `https://www.bible.com/bible/3034/${verse.passageId}`;
			const passage = await getPassageContent(verse.passageId, verse.bibleId);

			return {
				...verse,
				chapter,
				bibleDotComUrl,
				content: passage?.content ?? null,
				reference: passage?.reference ?? null,
			};
		} catch {
			return null;
		}
	});
