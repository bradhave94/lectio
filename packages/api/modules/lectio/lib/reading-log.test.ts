import { describe, expect, it } from "vitest";

import {
	dedupeChapterRanges,
	expandChapterRanges,
	formatChapterRanges,
	formatReadingLogDisplay,
	parseChapterRanges,
	validateReadingLogInput,
} from "./reading-log";

describe("formatReadingLogDisplay", () => {
	it("formats a whole chapter log", () => {
		expect(
			formatReadingLogDisplay({
				bookName: "Acts",
				chapterStart: 3,
				chapterEnd: 3,
				verseStart: null,
				verseEnd: null,
			}),
		).toBe("Acts 3");
	});

	it("formats a single verse range within one chapter", () => {
		expect(
			formatReadingLogDisplay({
				bookName: "Acts",
				chapterStart: 3,
				chapterEnd: 3,
				verseStart: 1,
				verseEnd: 16,
			}),
		).toBe("Acts 3:1–16");
	});

	it("formats a multi-chapter verse range", () => {
		expect(
			formatReadingLogDisplay({
				bookName: "Acts",
				chapterStart: 3,
				chapterEnd: 4,
				verseStart: 12,
				verseEnd: 8,
			}),
		).toBe("Acts 3:12–4:8");
	});
});

describe("validateReadingLogInput", () => {
	it("accepts whole chapter logs", () => {
		expect(
			validateReadingLogInput({
				chapter: 5,
				verseStart: null,
				verseEnd: null,
				maxVerseInChapter: 48,
			}),
		).toEqual({
			isValid: true,
		});
	});

	it("rejects partial verse range inputs", () => {
		expect(
			validateReadingLogInput({
				chapter: 5,
				verseStart: 1,
				verseEnd: null,
				maxVerseInChapter: 48,
			}),
		).toEqual({
			isValid: false,
			reason: "Both verse start and verse end must be provided.",
		});
	});

	it("rejects verse ranges beyond chapter boundaries", () => {
		expect(
			validateReadingLogInput({
				chapter: 1,
				verseStart: 30,
				verseEnd: 35,
				maxVerseInChapter: 31,
			}),
		).toEqual({
			isValid: false,
			reason: "Verse range exceeds chapter verse count (31).",
		});
	});
});

describe("parseChapterRanges", () => {
	it("parses an empty string as an empty list", () => {
		expect(parseChapterRanges("")).toEqual([]);
		expect(parseChapterRanges("   ")).toEqual([]);
	});

	it("parses a list of single chapters", () => {
		expect(parseChapterRanges("1, 3, 27")).toEqual([
			{ start: 1, end: 1 },
			{ start: 3, end: 3 },
			{ start: 27, end: 27 },
		]);
	});

	it("parses ranges with both ASCII and en-dash separators", () => {
		expect(parseChapterRanges("1-3, 5–7, 9")).toEqual([
			{ start: 1, end: 3 },
			{ start: 5, end: 7 },
			{ start: 9, end: 9 },
		]);
	});

	it("merges overlapping ranges", () => {
		expect(parseChapterRanges("1, 2, 3, 4, 5")).toEqual([{ start: 1, end: 5 }]);
		expect(parseChapterRanges("3-5, 4-6")).toEqual([{ start: 3, end: 6 }]);
	});

	it("returns null for malformed input", () => {
		expect(parseChapterRanges("abc")).toBeNull();
		expect(parseChapterRanges("1-")).toBeNull();
		expect(parseChapterRanges("5-3")).toBeNull();
		expect(parseChapterRanges("0")).toBeNull();
	});
});

describe("expandChapterRanges", () => {
	it("flattens to sorted unique chapter numbers", () => {
		expect(
			expandChapterRanges([
				{ start: 1, end: 3 },
				{ start: 2, end: 5 },
			]),
		).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("dedupeChapterRanges + formatChapterRanges", () => {
	it("merges adjacent ranges and formats them", () => {
		const ranges = dedupeChapterRanges([
			{ start: 1, end: 1 },
			{ start: 2, end: 3 },
			{ start: 7, end: 7 },
		]);
		expect(ranges).toEqual([
			{ start: 1, end: 3 },
			{ start: 7, end: 7 },
		]);
		expect(formatChapterRanges(ranges)).toBe("1–3, 7");
	});
});
