export interface ReadingLogDisplayInput {
	bookName: string;
	chapterStart: number;
	chapterEnd: number;
	verseStart: number | null;
	verseEnd: number | null;
}

export interface ValidateReadingLogInput {
	chapter: number;
	verseStart: number | null;
	verseEnd: number | null;
	maxVerseInChapter: number;
}

export interface ValidateReadingLogResult {
	isValid: boolean;
	reason?: string;
}

export function formatReadingLogDisplay(input: ReadingLogDisplayInput): string {
	const chapterPart =
		input.chapterStart === input.chapterEnd
			? `${input.chapterStart}`
			: `${input.chapterStart}–${input.chapterEnd}`;

	if (input.verseStart === null || input.verseEnd === null) {
		return `${input.bookName} ${chapterPart}`;
	}

	const versePart =
		input.verseStart === input.verseEnd
			? `${input.verseStart}`
			: `${input.verseStart}–${input.verseEnd}`;

	if (input.chapterStart === input.chapterEnd) {
		return `${input.bookName} ${input.chapterStart}:${versePart}`;
	}

	return `${input.bookName} ${input.chapterStart}:${input.verseStart}–${input.chapterEnd}:${input.verseEnd}`;
}

export interface ChapterRange {
	start: number;
	end: number;
}

/**
 * Parses a free-form chapter expression (e.g. `"1, 3, 5-7, 9"`) into a sorted,
 * de-duplicated list of inclusive chapter ranges. Returns `null` when the
 * input is malformed.
 */
export function parseChapterRanges(input: string): ChapterRange[] | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return [];
	}

	const tokens = trimmed
		.split(/[,\s]+/)
		.map((token) => token.trim())
		.filter(Boolean);

	const ranges: ChapterRange[] = [];

	for (const token of tokens) {
		const rangeMatch = token.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
		if (rangeMatch) {
			const start = Number.parseInt(rangeMatch[1], 10);
			const end = Number.parseInt(rangeMatch[2], 10);
			if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
				return null;
			}
			ranges.push({ start, end });
			continue;
		}

		const singleMatch = token.match(/^\d+$/);
		if (!singleMatch) {
			return null;
		}
		const chapter = Number.parseInt(token, 10);
		if (!Number.isInteger(chapter) || chapter < 1) {
			return null;
		}
		ranges.push({ start: chapter, end: chapter });
	}

	return dedupeChapterRanges(ranges);
}

/**
 * Flattens a list of chapter ranges into a sorted, de-duplicated list of
 * chapter numbers.
 */
export function expandChapterRanges(ranges: ChapterRange[]): number[] {
	const set = new Set<number>();
	for (const range of ranges) {
		for (let ch = range.start; ch <= range.end; ch += 1) {
			set.add(ch);
		}
	}
	return Array.from(set).sort((left, right) => left - right);
}

/**
 * Merges adjacent/overlapping chapter ranges.
 */
export function dedupeChapterRanges(ranges: ChapterRange[]): ChapterRange[] {
	if (ranges.length === 0) {
		return [];
	}

	const sorted = ranges.slice().sort((a, b) => a.start - b.start || a.end - b.end);
	const merged: ChapterRange[] = [];
	for (const range of sorted) {
		const last = merged[merged.length - 1];
		if (last && range.start <= last.end + 1) {
			last.end = Math.max(last.end, range.end);
			continue;
		}
		merged.push({ start: range.start, end: range.end });
	}

	return merged;
}

export function formatChapterRanges(ranges: ChapterRange[]): string {
	const normalized = dedupeChapterRanges(ranges);
	return normalized
		.map((range) => (range.start === range.end ? `${range.start}` : `${range.start}–${range.end}`))
		.join(", ");
}

export function validateReadingLogInput(
	input: ValidateReadingLogInput,
): ValidateReadingLogResult {
	if (input.chapter <= 0) {
		return {
			isValid: false,
			reason: "Chapter must be greater than zero.",
		};
	}

	if (input.verseStart === null && input.verseEnd === null) {
		return {
			isValid: true,
		};
	}

	if (input.verseStart === null || input.verseEnd === null) {
		return {
			isValid: false,
			reason: "Both verse start and verse end must be provided.",
		};
	}

	if (input.verseStart > input.verseEnd) {
		return {
			isValid: false,
			reason: "Verse start cannot be greater than verse end.",
		};
	}

	if (input.verseStart > input.maxVerseInChapter || input.verseEnd > input.maxVerseInChapter) {
		return {
			isValid: false,
			reason: `Verse range exceeds chapter verse count (${input.maxVerseInChapter}).`,
		};
	}

	return {
		isValid: true,
	};
}
