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
