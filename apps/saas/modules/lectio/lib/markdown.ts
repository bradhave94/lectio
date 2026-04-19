import { marked } from "marked";
import TurndownService from "turndown";

// GFM tables, task lists, strikethrough, autolinks.
marked.setOptions({
	gfm: true,
	breaks: true,
});

const turndown = new TurndownService({
	headingStyle: "atx",
	bulletListMarker: "-",
	codeBlockStyle: "fenced",
	fence: "```",
	emDelimiter: "_",
	strongDelimiter: "**",
	linkStyle: "inlined",
});

// Tiptap emits soft `<br>` inside paragraphs for shift-enter; turndown renders
// these as a backslash + newline by default which the markdown renderer then
// flattens. Replace them with two trailing spaces (the canonical Markdown
// soft-line-break) so the round-trip stays stable.
turndown.addRule("softBreak", {
	filter: "br",
	replacement: () => "  \n",
});

/**
 * Parses Markdown into the HTML representation Tiptap expects when seeding the
 * editor with stored content.
 */
export function markdownToHtml(markdown: string): string {
	if (!markdown.trim()) return "";
	return marked.parse(markdown, { async: false }) as string;
}

/**
 * Serialises Tiptap's HTML output back to Markdown so we keep the DB free of
 * raw HTML and the existing `NoteMarkdown` renderer continues to work.
 */
export function htmlToMarkdown(html: string): string {
	if (!html.trim()) return "";
	return turndown.turndown(html).trim();
}
