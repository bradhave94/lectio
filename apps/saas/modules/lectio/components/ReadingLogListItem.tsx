"use client";

import { formatReadingLogLabel } from "@lectio/lib/reading-log";
import { Button } from "@repo/ui";
import { Trash2Icon } from "lucide-react";
import { useFormatter } from "next-intl";

interface ReadingLogListItemProps {
	bookName: string;
	log: {
		id: string;
		chapterStart: number;
		chapterEnd: number;
		verseStart: number | null;
		verseEnd: number | null;
		note: string | null;
		loggedAt: string;
	};
	onDelete: (logId: string) => void;
	deleteLabel: string;
}

export function ReadingLogListItem({
	bookName,
	log,
	onDelete,
	deleteLabel,
}: ReadingLogListItemProps) {
	const format = useFormatter();

	return (
		<div className="rounded-xl border p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-medium text-sm">
						{bookName} {formatReadingLogLabel(log)}
					</p>
					<p className="text-xs text-muted-foreground">
						{format.dateTime(new Date(log.loggedAt), { dateStyle: "medium" })}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="text-destructive"
					onClick={() => onDelete(log.id)}
					aria-label={deleteLabel}
				>
					<Trash2Icon className="size-4" />
				</Button>
			</div>
			{log.note ? <p className="mt-1 text-sm text-muted-foreground">{log.note}</p> : null}
		</div>
	);
}
