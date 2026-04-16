import { and, asc, eq, notInArray } from "drizzle-orm";

import { bookChapters, books, db, testamentValues } from "@repo/database";
import { logger } from "@repo/logs";

const YOUVERSION_API_BASE_URL = "https://api.youversion.com/v1";
const DEFAULT_BIBLE_ID = 111;
const REQUEST_DELAY_MS = 120;
const MAX_PAGE_COUNT = 100;

type Testament = (typeof testamentValues)[number];

interface NormalizedBook {
	usfmCode: string;
	name: string;
	testament: Testament;
	canonOrder: number;
	chapterCount: number;
}

interface NormalizedChapter {
	chapterNum: number;
	verseCount: number;
}

interface PaginatedPayload {
	items: unknown[];
	nextPageToken: string | null;
}

interface ChapterSyncResult {
	bookId: number;
	usfmCode: string;
	chapters: number[];
}

function getApiKey() {
	const apiKey = process.env.YOUVERSION_API_KEY;
	if (!apiKey) {
		throw new Error("YOUVERSION_API_KEY is not configured.");
	}

	return apiKey;
}

function getBibleId() {
	const rawBibleId = process.env.YOUVERSION_BIBLE_ID;
	if (!rawBibleId) {
		return DEFAULT_BIBLE_ID;
	}

	const parsedBibleId = Number.parseInt(rawBibleId, 10);
	if (Number.isNaN(parsedBibleId) || parsedBibleId <= 0) {
		throw new Error(
			`Invalid YOUVERSION_BIBLE_ID value "${rawBibleId}". Expected a positive number.`,
		);
	}

	return parsedBibleId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseInteger(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}

	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}

	return null;
}

function readString(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}

	return null;
}

function readInteger(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = parseInteger(record[key]);
		if (value !== null) {
			return value;
		}
	}

	return null;
}

function extractChapterNumber(record: Record<string, unknown>) {
	const numberFromFields = readInteger(record, [
		"chapter_num",
		"chapter",
		"number",
		"ordinal",
		"index",
	]);
	if (numberFromFields !== null && numberFromFields > 0) {
		return numberFromFields;
	}

	const chapterLikeString = readString(record, [
		"id",
		"chapter_id",
		"passage_id",
		"reference",
		"slug",
	]);
	if (!chapterLikeString) {
		return null;
	}

	const chapterMatch = chapterLikeString.match(/(\d+)(?!.*\d)/);
	if (!chapterMatch) {
		return null;
	}

	const parsedChapter = Number.parseInt(chapterMatch[1], 10);
	if (Number.isNaN(parsedChapter) || parsedChapter <= 0) {
		return null;
	}

	return parsedChapter;
}

function extractVerseCount(payload: unknown): number | null {
	if (!isRecord(payload)) {
		return null;
	}

	const directVerseCount = readInteger(payload, [
		"verse_count",
		"verses_count",
		"verseCount",
		"versesCount",
		"num_verses",
	]);
	if (directVerseCount !== null && directVerseCount > 0) {
		return directVerseCount;
	}

	const versesValue = payload.verses;
	if (Array.isArray(versesValue) && versesValue.length > 0) {
		return versesValue.length;
	}

	if ("data" in payload) {
		return extractVerseCount(payload.data);
	}

	if ("chapter" in payload) {
		return extractVerseCount(payload.chapter);
	}

	return null;
}

function normalizeTestament(
	testamentRaw: string | null,
	canonOrder: number,
): Testament {
	if (testamentRaw?.toUpperCase() === "OT") {
		return "OT";
	}

	if (testamentRaw?.toUpperCase() === "NT") {
		return "NT";
	}

	return canonOrder <= 39 ? "OT" : "NT";
}

function normalizeUsfmCode(rawUsfmCode: string) {
	const normalized = rawUsfmCode
		.trim()
		.toUpperCase()
		.split(".")[0]
		.replace(/[^A-Z0-9]/g, "");

	if (normalized.length === 0) {
		return null;
	}

	return normalized;
}

function normalizeBook(rawBook: unknown, index: number): NormalizedBook | null {
	if (!isRecord(rawBook)) {
		return null;
	}

	const rawUsfmCode = readString(rawBook, [
		"usfm_code",
		"usfmCode",
		"usfm",
		"book_usfm",
		"id",
	]);

	if (!rawUsfmCode) {
		return null;
	}

	const usfmCode = normalizeUsfmCode(rawUsfmCode);
	if (!usfmCode) {
		return null;
	}

	const name = readString(rawBook, ["name", "title", "long_name", "full_name"]) ?? usfmCode;
	const canonOrder = readInteger(rawBook, [
		"canon_order",
		"canonOrder",
		"order",
		"position",
		"index",
	]) ?? index + 1;
	const chapterCountFromPayload =
		readInteger(rawBook, ["chapter_count", "chapters_count", "chapterCount", "num_chapters"]) ??
		1;
	const chapterCount = chapterCountFromPayload > 0 ? chapterCountFromPayload : 1;
	const testament = normalizeTestament(
		readString(rawBook, ["testament", "collection"]),
		canonOrder,
	);

	return {
		usfmCode,
		name,
		testament,
		canonOrder,
		chapterCount,
	};
}

function extractPagePayload(payload: unknown): PaginatedPayload {
	if (Array.isArray(payload)) {
		return {
			items: payload,
			nextPageToken: null,
		};
	}

	if (!isRecord(payload)) {
		return {
			items: [],
			nextPageToken: null,
		};
	}

	const nextPageToken =
		typeof payload.next_page_token === "string" && payload.next_page_token.length > 0
			? payload.next_page_token
			: null;

	const data = payload.data;
	if (Array.isArray(data)) {
		return {
			items: data,
			nextPageToken,
		};
	}

	if (isRecord(data) && Array.isArray(data.items)) {
		return {
			items: data.items,
			nextPageToken,
		};
	}

	return {
		items: [],
		nextPageToken,
	};
}

async function requestYouVersion(
	endpoint: string,
	searchParams?: URLSearchParams,
): Promise<unknown> {
	const requestUrl = new URL(`${YOUVERSION_API_BASE_URL}${endpoint}`);
	if (searchParams) {
		requestUrl.search = searchParams.toString();
	}

	const response = await fetch(requestUrl, {
		headers: {
			"x-yvp-app-key": getApiKey(),
		},
	});

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(
			`YouVersion request failed (${response.status}) for ${requestUrl.pathname}: ${responseText.slice(0, 200)}`,
		);
	}

	return response.json();
}

async function fetchAllPages(endpoint: string): Promise<unknown[]> {
	const items: unknown[] = [];
	const seenTokens = new Set<string>();
	let nextPageToken: string | null = null;

	for (let page = 0; page < MAX_PAGE_COUNT; page += 1) {
		const searchParams = new URLSearchParams();
		if (nextPageToken) {
			searchParams.set("page_token", nextPageToken);
		}

		const payload = await requestYouVersion(
			endpoint,
			searchParams.size > 0 ? searchParams : undefined,
		);
		const parsedPage = extractPagePayload(payload);
		items.push(...parsedPage.items);

		if (!parsedPage.nextPageToken) {
			return items;
		}

		if (seenTokens.has(parsedPage.nextPageToken)) {
			throw new Error(`Pagination loop detected for endpoint ${endpoint}.`);
		}

		seenTokens.add(parsedPage.nextPageToken);
		nextPageToken = parsedPage.nextPageToken;
	}

	throw new Error(
		`Pagination exceeded ${MAX_PAGE_COUNT} pages for endpoint ${endpoint}.`,
	);
}

function normalizeChapters(
	rawChapters: unknown[],
	fallbackChapterCount: number,
): NormalizedChapter[] {
	const chapterMap = new Map<number, number>();

	for (const rawChapter of rawChapters) {
		if (!isRecord(rawChapter)) {
			continue;
		}

		const chapterNum = extractChapterNumber(rawChapter);
		if (!chapterNum || chapterNum <= 0) {
			continue;
		}

		const verseCount =
			readInteger(rawChapter, [
				"verse_count",
				"verses_count",
				"verseCount",
				"versesCount",
				"num_verses",
			]) ?? 1;
		const normalizedVerseCount = verseCount > 0 ? verseCount : 1;
		chapterMap.set(chapterNum, normalizedVerseCount);
	}

	if (chapterMap.size === 0) {
		for (let chapterNum = 1; chapterNum <= fallbackChapterCount; chapterNum += 1) {
			chapterMap.set(chapterNum, 1);
		}
	}

	return Array.from(chapterMap.entries())
		.sort(([a], [b]) => a - b)
		.map(([chapterNum, verseCount]) => ({
			chapterNum,
			verseCount,
		}));
}

function sleep(durationMs: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, durationMs);
	});
}

async function fetchChapterDetail(
	bibleId: number,
	usfmCode: string,
	chapterNum: number,
) {
	const chapterEndpoints = [
		`/bibles/${bibleId}/books/${usfmCode}/chapters/${chapterNum}`,
		`/bibles/${bibleId}/books/${usfmCode}/chapters/${usfmCode}.${chapterNum}`,
	];

	let lastError: unknown = null;

	for (const endpoint of chapterEndpoints) {
		try {
			return await requestYouVersion(endpoint);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

async function syncBooks(bibleId: number) {
	logger.info(`Fetching books for Bible ${bibleId}...`);
	const rawBooks = await fetchAllPages(`/bibles/${bibleId}/books`);
	const parsedBooks = rawBooks
		.map((rawBook, index) => normalizeBook(rawBook, index))
		.filter((book): book is NormalizedBook => book !== null);

	const uniqueBooks = new Map<string, NormalizedBook>();
	for (const book of parsedBooks) {
		uniqueBooks.set(book.usfmCode, book);
	}

	const orderedBooks = Array.from(uniqueBooks.values()).sort(
		(a, b) => a.canonOrder - b.canonOrder,
	);

	if (orderedBooks.length === 0) {
		throw new Error(
			`YouVersion returned zero books for Bible ${bibleId}. Cannot continue seed.`,
		);
	}

	for (const book of orderedBooks) {
		await db
			.insert(books)
			.values({
				usfmCode: book.usfmCode,
				name: book.name,
				testament: book.testament,
				canonOrder: book.canonOrder,
				chapterCount: book.chapterCount,
			})
			.onConflictDoUpdate({
				target: books.usfmCode,
				set: {
					name: book.name,
					testament: book.testament,
					canonOrder: book.canonOrder,
					chapterCount: book.chapterCount,
				},
			});
	}

	logger.success(`Upserted ${orderedBooks.length} books.`);

	return db.query.books.findMany({
		orderBy: [asc(books.canonOrder)],
	});
}

async function syncBookChapters(
	bibleId: number,
	booksInDatabase: Array<{
		id: number;
		usfmCode: string;
		chapterCount: number;
	}>,
) {
	const results: ChapterSyncResult[] = [];
	let totalChapters = 0;

	for (const [bookIndex, book] of booksInDatabase.entries()) {
		logger.info(
			`Syncing chapter list for ${book.usfmCode} (${bookIndex + 1}/${booksInDatabase.length})...`,
		);

		const rawChapters = await fetchAllPages(
			`/bibles/${bibleId}/books/${book.usfmCode}/chapters`,
		);
		const parsedChapters = normalizeChapters(rawChapters, book.chapterCount);

		for (const chapter of parsedChapters) {
			await db
				.insert(bookChapters)
				.values({
					bookId: book.id,
					chapterNum: chapter.chapterNum,
					verseCount: chapter.verseCount,
				})
				.onConflictDoUpdate({
					target: [bookChapters.bookId, bookChapters.chapterNum],
					set: {
						verseCount: chapter.verseCount,
					},
				});
		}

		const chapterNumbers = parsedChapters.map((chapter) => chapter.chapterNum);
		if (chapterNumbers.length > 0) {
			await db
				.delete(bookChapters)
				.where(
					and(
						eq(bookChapters.bookId, book.id),
						notInArray(bookChapters.chapterNum, chapterNumbers),
					),
				);
		}

		await db
			.update(books)
			.set({
				chapterCount: parsedChapters.length,
			})
			.where(eq(books.id, book.id));

		totalChapters += parsedChapters.length;
		results.push({
			bookId: book.id,
			usfmCode: book.usfmCode,
			chapters: chapterNumbers,
		});
	}

	logger.success(`Upserted chapter metadata for ${totalChapters} chapters.`);
	return results;
}

async function syncVerseCounts(
	bibleId: number,
	chapterSyncResults: ChapterSyncResult[],
) {
	let updatedCount = 0;
	let skippedCount = 0;
	let requestCount = 0;

	for (const [bookIndex, book] of chapterSyncResults.entries()) {
		logger.info(
			`Syncing verse counts for ${book.usfmCode} (${bookIndex + 1}/${chapterSyncResults.length})...`,
		);

		for (const chapterNum of book.chapters) {
			const chapterDetail = await fetchChapterDetail(
				bibleId,
				book.usfmCode,
				chapterNum,
			);
			requestCount += 1;

			const verseCount = extractVerseCount(chapterDetail);
			if (!verseCount || verseCount <= 0) {
				skippedCount += 1;
				logger.warn(
					`Skipping ${book.usfmCode} ${chapterNum}: no verse count found in response.`,
				);
				await sleep(REQUEST_DELAY_MS);
				continue;
			}

			await db
				.update(bookChapters)
				.set({
					verseCount,
				})
				.where(
					and(
						eq(bookChapters.bookId, book.bookId),
						eq(bookChapters.chapterNum, chapterNum),
					),
				);
			updatedCount += 1;

			await sleep(REQUEST_DELAY_MS);
		}
	}

	logger.success(
		`Processed ${requestCount} chapter detail requests. Updated ${updatedCount} verse counts, skipped ${skippedCount}.`,
	);
}

async function main() {
	const startedAt = Date.now();
	const bibleId = getBibleId();

	logger.info(`Starting Lectio seed for Bible ${bibleId}.`);

	const booksInDatabase = await syncBooks(bibleId);
	const chapterSyncResults = await syncBookChapters(
		bibleId,
		booksInDatabase.map((book) => ({
			id: book.id,
			usfmCode: book.usfmCode,
			chapterCount: book.chapterCount,
		})),
	);
	await syncVerseCounts(bibleId, chapterSyncResults);

	const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
	logger.success(
		`Lectio seed finished successfully in ${elapsedSeconds}s for Bible ${bibleId}.`,
	);
}

main().catch((error) => {
	logger.error("Lectio seed failed.");
	logger.error(error);
	process.exitCode = 1;
});
