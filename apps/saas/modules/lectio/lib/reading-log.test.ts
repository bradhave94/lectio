import { describe, expect, it } from "vitest";

import { formatReadingLogLabel } from "./reading-log";

describe("formatReadingLogLabel", () => {
	it("formats a whole chapter", () => {
		expect(
			formatReadingLogLabel({
				chapterStart: 2,
				chapterEnd: 2,
				verseStart: null,
				verseEnd: null,
			}),
		).toBe("2");
	});

	it("formats a chapter verse range", () => {
		expect(
			formatReadingLogLabel({
				chapterStart: 2,
				chapterEnd: 2,
				verseStart: 1,
				verseEnd: 4,
			}),
		).toBe("2:1–4");
	});

	it("formats multi chapter verse ranges", () => {
		expect(
			formatReadingLogLabel({
				chapterStart: 2,
				chapterEnd: 3,
				verseStart: 24,
				verseEnd: 5,
			}),
		).toBe("2:24–3:5");
	});
});
