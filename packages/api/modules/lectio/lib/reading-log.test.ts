import { describe, expect, it } from "vitest";

import {
	formatReadingLogDisplay,
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
