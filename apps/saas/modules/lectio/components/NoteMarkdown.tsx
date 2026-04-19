"use client";

import { cn } from "@repo/ui";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface NoteMarkdownProps {
	content: string | null | undefined;
	className?: string;
	emptyState?: ReactNode;
}

/**
 * Renders a reading-log note with Markdown + GitHub-flavored extensions
 * (tables, task lists, autolinks). Sanitized via rehype-sanitize so we
 * never execute embedded HTML/script — all images are stripped to keep
 * the note format text-first.
 *
 * Tailwind styling lives in the wrapper since we don't ship `prose`.
 */
export function NoteMarkdown({ content, className, emptyState }: NoteMarkdownProps) {
	const text = (content ?? "").trim();
	if (!text) {
		return emptyState ? <>{emptyState}</> : null;
	}

	return (
		<div
			className={cn(
				"text-sm text-foreground/90 leading-relaxed space-y-2",
				"[&_p]:m-0 [&_p+p]:mt-2",
				"[&_strong]:font-semibold",
				"[&_em]:italic",
				"[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline",
				"[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
				"[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:overflow-x-auto",
				"[&_pre_code]:bg-transparent [&_pre_code]:p-0",
				"[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-0.5",
				"[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
				"[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold",
				"[&_hr]:my-3 [&_hr]:border-border",
				"[&_table]:w-full [&_th]:text-left [&_th]:font-medium [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border [&_th]:border [&_td]:border [&_table]:border-border",
				className,
			)}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeSanitize]}
				components={{
					a: ({ children, ...props }) => (
						<a {...props} target="_blank" rel="noreferrer noopener">
							{children}
						</a>
					),
					img: () => null,
				}}
			>
				{text}
			</ReactMarkdown>
		</div>
	);
}
