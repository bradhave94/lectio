"use client";

import { formatChapterListLabel } from "@lectio/lib/reading-log";
import { cn, Input, Label } from "@repo/ui";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

export interface ChapterRange {
	start: number;
	end: number;
}

export interface ChapterPickerProps {
	availableChapters: number[];
	selected: number[];
	onChange: (next: number[]) => void;
	/** Optional bookId — when it changes the shift-click anchor resets. */
	resetKey?: string | number | null;
	/** Display + parse text mirror under the label (default: true). */
	showText?: boolean;
	className?: string;
}

/**
 * Parses a free-form chapter expression like `"1, 3, 5-7"` into ranges, or
 * returns `null` if the input is malformed.
 */
function parseChapterExpression(input: string): ChapterRange[] | null {
	const trimmed = input.trim();
	if (!trimmed) return [];

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

		if (!/^\d+$/.test(token)) return null;
		const chapter = Number.parseInt(token, 10);
		if (!Number.isInteger(chapter) || chapter < 1) return null;
		ranges.push({ start: chapter, end: chapter });
	}

	return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function chaptersFromRanges(ranges: ChapterRange[]): number[] {
	const set = new Set<number>();
	for (const range of ranges) {
		for (let ch = range.start; ch <= range.end; ch += 1) {
			set.add(ch);
		}
	}
	return Array.from(set).sort((a, b) => a - b);
}

export function rangesFromChapters(chapters: number[]): ChapterRange[] {
	if (chapters.length === 0) return [];
	const sorted = Array.from(new Set(chapters)).sort((a, b) => a - b);
	const result: ChapterRange[] = [];
	let current = { start: sorted[0], end: sorted[0] };
	for (let i = 1; i < sorted.length; i += 1) {
		if (sorted[i] === current.end + 1) {
			current.end = sorted[i];
			continue;
		}
		result.push(current);
		current = { start: sorted[i], end: sorted[i] };
	}
	result.push(current);
	return result;
}

export function ChapterPicker({
	availableChapters,
	selected,
	onChange,
	resetKey,
	showText = true,
	className,
}: ChapterPickerProps) {
	const t = useTranslations("lectio.chapterPicker");
	const [chapterText, setChapterText] = useState(() =>
		formatChapterListLabel(rangesFromChapters(selected)),
	);
	const [chapterTextError, setChapterTextError] = useState(false);
	const anchorRef = useRef<number | null>(null);

	// Sync the text mirror whenever the selection changes externally (e.g.
	// because the consumer reset the form or replaced the selection).
	useEffect(() => {
		setChapterText(formatChapterListLabel(rangesFromChapters(selected)));
		setChapterTextError(false);
	}, [selected]);

	// Reset the shift-click anchor whenever the picker is repurposed for a
	// different book/scope.
	useEffect(() => {
		anchorRef.current = null;
	}, [resetKey]);

	const availableSet = useMemo(() => new Set(availableChapters), [availableChapters]);

	const handleChipClick = (chapter: number, event: MouseEvent<HTMLButtonElement>) => {
		const isShift = event.shiftKey && anchorRef.current != null;
		if (isShift) {
			const anchor = anchorRef.current as number;
			const lo = Math.min(anchor, chapter);
			const hi = Math.max(anchor, chapter);
			const next = new Set(selected);
			for (let ch = lo; ch <= hi; ch += 1) {
				if (availableSet.has(ch)) {
					next.add(ch);
				}
			}
			anchorRef.current = chapter;
			onChange(Array.from(next).sort((a, b) => a - b));
			return;
		}

		anchorRef.current = chapter;
		const exists = selected.includes(chapter);
		const next = exists
			? selected.filter((value) => value !== chapter)
			: [...selected, chapter].sort((a, b) => a - b);
		onChange(next);
	};

	const handleTextChange = (value: string) => {
		setChapterText(value);
		const parsed = parseChapterExpression(value);
		if (parsed === null) {
			setChapterTextError(true);
			return;
		}
		setChapterTextError(false);
		const flattened = chaptersFromRanges(parsed);
		const filtered = flattened.filter((chapter) => availableSet.has(chapter));
		onChange(filtered);
	};

	return (
		<div className={cn("space-y-2", className)}>
			{showText ? (
				<>
					<div className="flex items-center justify-between">
						<Label htmlFor="chapter-text-input">
							{t("label")}
							<span className="ml-2 text-xs font-normal text-muted-foreground">
								{t("hint")}
							</span>
						</Label>
						<span className="text-xs text-muted-foreground">
							{t("count", { count: selected.length })}
						</span>
					</div>
					<Input
						id="chapter-text-input"
						value={chapterText}
						onChange={(event) => handleTextChange(event.target.value)}
						placeholder="1, 3, 5-7"
						className={cn(chapterTextError && "border-destructive")}
					/>
					{chapterTextError ? (
						<p className="text-xs text-destructive">{t("invalid")}</p>
					) : null}
				</>
			) : null}

			<div className="gap-1.5 sm:grid-cols-10 grid grid-cols-8">
				{availableChapters.map((chapter) => {
					const isSelected = selected.includes(chapter);
					return (
						<button
							key={chapter}
							type="button"
							aria-pressed={isSelected}
							onClick={(event) => handleChipClick(chapter, event)}
							className={cn(
								"h-9 text-sm font-medium relative rounded-md border transition-colors",
								isSelected
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background hover:bg-accent",
							)}
						>
							{chapter}
							{isSelected ? (
								<CheckIcon className="size-2.5 top-0.5 right-0.5 absolute opacity-70" />
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
