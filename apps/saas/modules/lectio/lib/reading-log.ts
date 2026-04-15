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
