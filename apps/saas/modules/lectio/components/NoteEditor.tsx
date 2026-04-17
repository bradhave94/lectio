"use client";

import { htmlToMarkdown, markdownToHtml } from "@lectio/lib/markdown";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@repo/ui";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import {
	BoldIcon,
	CodeIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	ItalicIcon,
	LinkIcon,
	ListIcon,
	ListOrderedIcon,
	MinusIcon,
	QuoteIcon,
	RedoIcon,
	SquareCodeIcon,
	UndoIcon,
	UnlinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";

interface NoteEditorProps {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	id?: string;
	className?: string;
	disabled?: boolean;
	/** Minimum body height in pixels. Defaults to 180. */
	minHeight?: number;
}

/**
 * Rich-text editor for reading-log notes. Stores Markdown so the existing
 * `NoteMarkdown` renderer can show the same content read-only across the app.
 *
 * Round-trip: incoming Markdown → HTML (marked) for Tiptap; outgoing HTML →
 * Markdown (turndown) before calling `onChange`. We hold the latest emitted
 * Markdown in a ref so external value updates that match the current draft
 * don't cause a `setContent` loop.
 */
export function NoteEditor({
	value,
	onChange,
	placeholder,
	id,
	className,
	disabled,
	minHeight = 180,
}: NoteEditorProps) {
	const t = useTranslations("lectio.editor.note");
	const lastEmittedRef = useRef<string>(value);

	const editor = useEditor({
		// Avoid SSR hydration mismatches by deferring render to the client.
		immediatelyRender: false,
		editable: !disabled,
		content: markdownToHtml(value),
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3] },
				codeBlock: { HTMLAttributes: { class: "rounded-md bg-muted p-3" } },
			}),
			Link.configure({
				openOnClick: false,
				autolink: true,
				HTMLAttributes: {
					rel: "noreferrer noopener",
					target: "_blank",
				},
			}),
			Placeholder.configure({
				placeholder: placeholder ?? t("placeholder"),
			}),
		],
		editorProps: {
			attributes: {
				id: id ?? "note-editor",
				class: cn(
					"focus:outline-hidden px-3 py-3 text-sm leading-relaxed text-foreground/90",
				),
				"aria-label": t("ariaLabel"),
			},
		},
		onUpdate({ editor: live }) {
			const html = live.getHTML();
			const markdown = htmlToMarkdown(html);
			if (markdown !== lastEmittedRef.current) {
				lastEmittedRef.current = markdown;
				onChange(markdown);
			}
		},
	});

	// Sync external `value` changes (e.g. switching to a different log entry,
	// or a reset to the server snapshot) into the editor.
	useEffect(() => {
		if (!editor) return;
		if (value === lastEmittedRef.current) return;
		const nextHtml = markdownToHtml(value);
		const currentHtml = editor.getHTML();
		if (nextHtml === currentHtml) return;
		lastEmittedRef.current = value;
		editor.commands.setContent(nextHtml, { emitUpdate: false });
	}, [value, editor]);

	useEffect(() => {
		if (!editor) return;
		if (editor.isEditable !== !disabled) {
			editor.setEditable(!disabled);
		}
	}, [disabled, editor]);

	if (!editor) {
		return (
			<div
				className={cn(
					"rounded-md border border-input bg-card",
					className,
				)}
				style={{ minHeight }}
			/>
		);
	}

	const promptForLink = () => {
		const previous = editor.getAttributes("link").href as string | undefined;
		const next = window.prompt(t("linkPromptUrl"), previous ?? "https://");
		if (next === null) return;
		const trimmed = next.trim();
		if (!trimmed) {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
	};

	return (
		<div
			className={cn(
				"rounded-md border border-input bg-card overflow-hidden",
				disabled && "opacity-60 pointer-events-none",
				className,
			)}
		>
			<TooltipProvider delayDuration={120}>
				<div className="gap-0.5 flex flex-wrap items-center border-b bg-muted/30 px-1.5 py-1">
					<ToolbarButton
						label={t("bold")}
						active={editor.isActive("bold")}
						disabled={!editor.can().chain().focus().toggleBold().run()}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<BoldIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("italic")}
						active={editor.isActive("italic")}
						disabled={!editor.can().chain().focus().toggleItalic().run()}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<ItalicIcon className="size-4" />
					</ToolbarButton>
					<ToolbarSeparator />
					<ToolbarButton
						label={t("heading1")}
						active={editor.isActive("heading", { level: 1 })}
						onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					>
						<Heading1Icon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("heading2")}
						active={editor.isActive("heading", { level: 2 })}
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					>
						<Heading2Icon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("heading3")}
						active={editor.isActive("heading", { level: 3 })}
						onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					>
						<Heading3Icon className="size-4" />
					</ToolbarButton>
					<ToolbarSeparator />
					<ToolbarButton
						label={t("bulletList")}
						active={editor.isActive("bulletList")}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					>
						<ListIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("orderedList")}
						active={editor.isActive("orderedList")}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
					>
						<ListOrderedIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("quote")}
						active={editor.isActive("blockquote")}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					>
						<QuoteIcon className="size-4" />
					</ToolbarButton>
					<ToolbarSeparator />
					<ToolbarButton
						label={t("code")}
						active={editor.isActive("code")}
						onClick={() => editor.chain().focus().toggleCode().run()}
					>
						<CodeIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("codeBlock")}
						active={editor.isActive("codeBlock")}
						onClick={() => editor.chain().focus().toggleCodeBlock().run()}
					>
						<SquareCodeIcon className="size-4" />
					</ToolbarButton>
					<ToolbarSeparator />
					<ToolbarButton
						label={t("link")}
						active={editor.isActive("link")}
						onClick={promptForLink}
					>
						<LinkIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("unlink")}
						disabled={!editor.isActive("link")}
						onClick={() => editor.chain().focus().unsetLink().run()}
					>
						<UnlinkIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("divider")}
						onClick={() => editor.chain().focus().setHorizontalRule().run()}
					>
						<MinusIcon className="size-4" />
					</ToolbarButton>
					<ToolbarSeparator />
					<ToolbarButton
						label={t("undo")}
						disabled={!editor.can().chain().focus().undo().run()}
						onClick={() => editor.chain().focus().undo().run()}
					>
						<UndoIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label={t("redo")}
						disabled={!editor.can().chain().focus().redo().run()}
						onClick={() => editor.chain().focus().redo().run()}
					>
						<RedoIcon className="size-4" />
					</ToolbarButton>
				</div>
			</TooltipProvider>
			<EditorContent
				editor={editor}
				style={{ minHeight }}
				className={cn(
					// Match the read-only NoteMarkdown styling so view ↔ edit doesn't shift.
					"[&_.tiptap]:outline-none",
					"[&_.tiptap_p]:my-1 [&_.tiptap_p:first-child]:mt-0",
					"[&_.tiptap_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
					"[&_.tiptap_p.is-editor-empty:first-child]:before:text-muted-foreground",
					"[&_.tiptap_p.is-editor-empty:first-child]:before:float-left",
					"[&_.tiptap_p.is-editor-empty:first-child]:before:pointer-events-none",
					"[&_.tiptap_p.is-editor-empty:first-child]:before:h-0",
					"[&_.tiptap_strong]:font-semibold",
					"[&_.tiptap_em]:italic",
					"[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline-offset-2 hover:[&_.tiptap_a]:underline",
					"[&_.tiptap_code]:rounded [&_.tiptap_code]:bg-muted [&_.tiptap_code]:px-1 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:text-xs",
					"[&_.tiptap_pre]:rounded-md [&_.tiptap_pre]:bg-muted [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:overflow-x-auto",
					"[&_.tiptap_pre_code]:bg-transparent [&_.tiptap_pre_code]:p-0",
					"[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5",
					"[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5",
					"[&_.tiptap_li]:my-0.5",
					"[&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:border-muted-foreground/30 [&_.tiptap_blockquote]:pl-3 [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:italic",
					"[&_.tiptap_h1]:text-base [&_.tiptap_h1]:font-semibold [&_.tiptap_h1]:mt-3",
					"[&_.tiptap_h2]:text-sm [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mt-2.5",
					"[&_.tiptap_h3]:text-sm [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mt-2",
					"[&_.tiptap_hr]:my-3 [&_.tiptap_hr]:border-border",
				)}
			/>
		</div>
	);
}

interface ToolbarButtonProps {
	label: string;
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	children: ReactNode;
}

function ToolbarButton({ label, onClick, active, disabled, children }: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={label}
					aria-pressed={active}
					onClick={onClick}
					disabled={disabled}
					className={cn(
						"size-8 inline-flex items-center justify-center rounded-md transition-colors",
						"text-muted-foreground hover:text-foreground hover:bg-accent",
						active && "bg-accent text-foreground",
						disabled && "opacity-40 pointer-events-none",
					)}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p className="text-xs">{label}</p>
			</TooltipContent>
		</Tooltip>
	);
}

function ToolbarSeparator() {
	return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}
