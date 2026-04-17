"use client";

import { NoteMarkdown } from "@lectio/components/NoteMarkdown";
import type { RecentLogsResponse } from "@lectio/hooks/use-lectio";
import { colorTokens, iconForKey } from "@lectio/lib/constants";
import { formatReadingLogLabel } from "@lectio/lib/reading-log";
import { Button, Card, cn } from "@repo/ui";
import { Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

interface ReadingActivityFeedProps {
	entries: RecentLogsResponse;
	isLoading?: boolean;
	showPlanLabel?: boolean;
	emptyMessage?: string;
	onDelete?: (entry: RecentLogsResponse[number]) => void;
}

interface GroupedSubmission {
	submissionId: string;
	planId: string;
	planTitle: string;
	planColor: string | null;
	planIcon: string | null;
	bookName: string;
	loggedAt: string;
	note: string | null;
	entries: RecentLogsResponse;
}

function groupBySubmission(entries: RecentLogsResponse): GroupedSubmission[] {
	const groups: GroupedSubmission[] = [];
	const groupKeyToIndex = new Map<string, number>();

	for (const entry of entries) {
		// Entries without a submissionId are grouped by themselves.
		const key = entry.submissionId
			? `${entry.submissionId}:${entry.planBookId}`
			: `solo:${entry.id}`;

		const existingIndex = groupKeyToIndex.get(key);
		if (existingIndex == null) {
			groupKeyToIndex.set(key, groups.length);
			groups.push({
				submissionId: entry.submissionId ?? entry.id,
				planId: entry.planId,
				planTitle: entry.planTitle,
				planColor: entry.planColor,
				planIcon: entry.planIcon,
				bookName: entry.bookName,
				loggedAt: entry.loggedAt,
				note: entry.note,
				entries: [entry],
			});
		} else {
			groups[existingIndex].entries.push(entry);
		}
	}

	return groups;
}

export function ReadingActivityFeed({
	entries,
	isLoading,
	showPlanLabel,
	emptyMessage,
	onDelete,
}: ReadingActivityFeedProps) {
	const t = useTranslations("lectio.feed");
	const format = useFormatter();

	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 3 }).map((_, idx) => (
					<div key={idx} className="h-16 animate-pulse rounded-md bg-muted" />
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<Card className="p-6 text-sm text-center text-muted-foreground">
				{emptyMessage ?? t("empty")}
			</Card>
		);
	}

	const grouped = groupBySubmission(entries);

	return (
		<ul className="space-y-2">
			{grouped.map((group) => {
				const tokens = colorTokens(group.planColor);
				const Icon = iconForKey(group.planIcon);
				const passages = group.entries
					.map(
						(entry) =>
							`${entry.bookName} ${formatReadingLogLabel({
								chapterStart: entry.chapterStart,
								chapterEnd: entry.chapterEnd,
								verseStart: entry.verseStart,
								verseEnd: entry.verseEnd,
							})}`,
					)
					.join(", ");

				return (
					<li key={group.submissionId}>
						<Card className="p-3">
							<div className="gap-3 flex items-start justify-between">
								<div className="min-w-0 gap-2 flex items-start">
									<span
										className={cn(
											"size-8 flex shrink-0 items-center justify-center rounded-md",
											tokens.soft,
										)}
									>
										<Icon className={cn("size-4", tokens.text)} />
									</span>
									<div className="min-w-0 space-y-0.5">
										<p className="font-medium text-sm leading-tight">{passages}</p>
										<p className="text-xs text-muted-foreground">
											{format.dateTime(new Date(group.loggedAt), {
												dateStyle: "medium",
											})}
											{showPlanLabel ? (
												<>
													{" · "}
													<Link href={`/plans/${group.planId}`} className="hover:underline">
														{group.planTitle}
													</Link>
												</>
											) : null}
										</p>
										{group.note ? (
											<NoteMarkdown
												content={group.note}
												className="mt-1 text-muted-foreground line-clamp-3"
											/>
										) : null}
									</div>
								</div>
								{onDelete && group.entries.length === 1 ? (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="text-destructive"
										aria-label={t("delete")}
										onClick={() => onDelete(group.entries[0])}
									>
										<Trash2Icon className="size-4" />
									</Button>
								) : null}
							</div>
						</Card>
					</li>
				);
			})}
		</ul>
	);
}
