"use client";

import { cn } from "@repo/ui";
import type { ReactNode } from "react";

interface NoteMarkdownProps {
	content: string | null | undefined;
	className?: string;
	emptyState?: ReactNode;
}

/**
 * Renders a reading-log note. Markdown rendering will be wired in Phase 3 of
 * the polish pass; today this just preserves whitespace + line breaks.
 */
export function NoteMarkdown({ content, className, emptyState }: NoteMarkdownProps) {
	const text = (content ?? "").trim();
	if (!text) {
		return emptyState ? <>{emptyState}</> : null;
	}

	return (
		<div
			className={cn("text-sm whitespace-pre-line text-foreground/90 leading-relaxed", className)}
		>
			{text}
		</div>
	);
}
