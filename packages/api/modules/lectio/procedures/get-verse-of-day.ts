import { publicProcedure } from "../../../orpc/procedures";
import { getYouVersionVerseOfDay } from "../lib/youversion";

export const getVerseOfDayProcedure = publicProcedure
	.route({
		method: "GET",
		path: "/lectio/verse-of-day",
		tags: ["Lectio"],
		summary: "Get Verse of the Day",
		description:
			"Fetches today's verse of the day metadata from YouVersion and returns Bible.com deep links.",
	})
	.handler(async () => {
		try {
			const verse = await getYouVersionVerseOfDay();

			if (!verse) {
				return null;
			}

			const chapter = `${verse.usfmCode}.${verse.chapter}`;
			const bibleDotComUrl = `https://www.bible.com/bible/3034/${chapter}`;

			return {
				...verse,
				chapter,
				bibleDotComUrl,
			};
		} catch {
			return null;
		}
	});
