export interface ReadingLogLike {
	chapterStart: number;
	chapterEnd: number;
	verseStart: number | null;
	verseEnd: number | null;
}

export function formatReadingLogLabel(log: ReadingLogLike): string {
	const chapterLabel =
		log.chapterStart === log.chapterEnd
			? `${log.chapterStart}`
			: `${log.chapterStart}–${log.chapterEnd}`;

	if (log.verseStart === null || log.verseEnd === null) {
		return chapterLabel;
	}

	const verseLabel =
		log.verseStart === log.verseEnd ? `${log.verseStart}` : `${log.verseStart}–${log.verseEnd}`;

	if (log.chapterStart === log.chapterEnd) {
		return `${log.chapterStart}:${verseLabel}`;
	}

	return `${log.chapterStart}:${log.verseStart}–${log.chapterEnd}:${log.verseEnd}`;
}

/**
 * Returns a friendly chapter-range label for a list of grouped logs that share
 * a submission. Uses an en-dash for ranges and a comma for separations.
 *
 * Example: `[{ start: 1, end: 1 }, { start: 3, end: 5 }]` → `"1, 3–5"`.
 */
export function formatChapterListLabel(ranges: Array<{ start: number; end: number }>): string {
	if (ranges.length === 0) {
		return "";
	}

	return ranges
		.map((range) => (range.start === range.end ? `${range.start}` : `${range.start}–${range.end}`))
		.join(", ");
}

export interface ChapterCoverageInput {
	chapterStart: number;
	chapterEnd: number;
}

/**
 * Aggregates a list of reading log rows into a sorted, de-duplicated set of
 * chapter numbers covered.
 */
export function flattenChapterCoverage(logs: ChapterCoverageInput[]): number[] {
	const set = new Set<number>();
	for (const log of logs) {
		for (let ch = log.chapterStart; ch <= log.chapterEnd; ch += 1) {
			set.add(ch);
		}
	}
	return Array.from(set).sort((a, b) => a - b);
}
