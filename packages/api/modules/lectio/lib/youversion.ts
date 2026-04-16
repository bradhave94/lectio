const YOUVERSION_API_BASE_URL = "https://api.youversion.com/v1";
const BSB_BIBLE_ID = 3034;

interface VerseOfDayResponse {
	day: number;
	passage_id: string;
}

function getApiKey() {
	const apiKey = process.env.YOUVERSION_API_KEY;
	if (!apiKey) {
		throw new Error("YOUVERSION_API_KEY is not configured");
	}

	return apiKey;
}

async function requestYouVersion<T>(endpoint: string): Promise<T> {
	const response = await fetch(`${YOUVERSION_API_BASE_URL}${endpoint}`, {
		headers: {
			"x-yvp-app-key": getApiKey(),
		},
	});

	if (!response.ok) {
		throw new Error(`YouVersion request failed (${response.status}) for ${endpoint}`);
	}

	return (await response.json()) as T;
}

function normalizeVerseOfDayResponse(payload: unknown): VerseOfDayResponse {
	if (payload && typeof payload === "object") {
		const record = payload as Record<string, unknown>;

		if (
			typeof record.day === "number" &&
			typeof record.passage_id === "string"
		) {
			return {
				day: record.day,
				passage_id: record.passage_id,
			};
		}

		if (record.data && typeof record.data === "object") {
			const nested = record.data as Record<string, unknown>;
			if (
				typeof nested.day === "number" &&
				typeof nested.passage_id === "string"
			) {
				return {
					day: nested.day,
					passage_id: nested.passage_id,
				};
			}
		}
	}

	throw new Error("Unable to parse verse-of-the-day payload");
}

function parsePassageId(passageId: string) {
	const [usfmCode, chapterRaw] = passageId.split(".");
	const chapter = Number.parseInt(chapterRaw ?? "", 10);

	if (!usfmCode || Number.isNaN(chapter) || chapter <= 0) {
		throw new Error(`Unexpected passage id format: ${passageId}`);
	}

	return {
		usfmCode,
		chapter,
	};
}

export interface VerseOfDayData {
	day: number;
	passageId: string;
	usfmCode: string;
	chapter: number;
	bibleId: number;
	bibleComChapterUrl: string;
}

export async function getVerseOfDay(day: number): Promise<VerseOfDayData> {
	const endpoints = [`/verse-of-the-days/${day}`, `/verse_of_the_days/${day}`];

	let parsedResponse: VerseOfDayResponse | null = null;
	let lastError: unknown = null;

	for (const endpoint of endpoints) {
		try {
			const response = await requestYouVersion<unknown>(endpoint);
			parsedResponse = normalizeVerseOfDayResponse(response);
			break;
		} catch (error) {
			lastError = error;
		}
	}

	if (!parsedResponse) {
		throw new Error(
			`Failed to fetch verse of the day${
				lastError instanceof Error ? `: ${lastError.message}` : ""
			}`,
		);
	}

	const { usfmCode, chapter } = parsePassageId(parsedResponse.passage_id);

	return {
		day: parsedResponse.day,
		passageId: parsedResponse.passage_id,
		usfmCode,
		chapter,
		bibleId: BSB_BIBLE_ID,
		bibleComChapterUrl: `https://www.bible.com/bible/${BSB_BIBLE_ID}/${usfmCode}.${chapter}`,
	};
}

export function getCurrentDayOfYear(date = new Date()) {
	const start = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - start.getTime();
	const oneDay = 1000 * 60 * 60 * 24;
	return Math.floor(diff / oneDay);
}

export const youVersionConfig = {
	apiBaseUrl: YOUVERSION_API_BASE_URL,
	bibleId: BSB_BIBLE_ID,
};

export async function getYouVersionVerseOfDay() {
	const day = getCurrentDayOfYear();
	return getVerseOfDay(day);
}
