"use client";

import { TESTAMENT_OPTIONS } from "@lectio/lib/constants";
import { useBooksQuery, type BooksResponse } from "@lectio/hooks/use-lectio";
import { Badge, Button, Card, cn, Input, Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface BookPickerPanelProps {
	/** IDs of books that are already in the plan (for visual disabling). */
	excludedBookIds?: number[];
	/** IDs of currently selected (queued) books. */
	selectedBookIds: number[];
	onSelectionChange: (next: number[]) => void;
	onAddSelected?: (bookIds: number[]) => void;
	isAdding?: boolean;
}

export function BookPickerPanel({
	excludedBookIds = [],
	selectedBookIds,
	onSelectionChange,
	onAddSelected,
	isAdding,
}: BookPickerPanelProps) {
	const t = useTranslations("lectio");
	const [search, setSearch] = useState("");
	const [testament, setTestament] = useState<"ALL" | "OT" | "NT">("ALL");

	const { data: books = [] as BooksResponse, isPending } = useBooksQuery({
		search,
		testament: testament === "ALL" ? undefined : testament,
	});

	const excludedSet = useMemo(() => new Set(excludedBookIds), [excludedBookIds]);
	const selectedSet = useMemo(() => new Set(selectedBookIds), [selectedBookIds]);

	const toggleBook = (bookId: number) => {
		if (excludedSet.has(bookId)) {
			return;
		}
		const next = new Set(selectedBookIds);
		if (next.has(bookId)) {
			next.delete(bookId);
		} else {
			next.add(bookId);
		}
		onSelectionChange(Array.from(next));
	};

	return (
		<Card className="p-4 md:p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-semibold text-lg">{t("editor.bookPicker.title")}</h2>
				{onAddSelected ? (
					<Button
						type="button"
						size="sm"
						onClick={() => onAddSelected(selectedBookIds)}
						disabled={selectedBookIds.length === 0 || isAdding}
						loading={isAdding}
					>
						<PlusIcon className="mr-1.5 size-4" />
						{t("editor.bookPicker.addSelected", { count: selectedBookIds.length })}
					</Button>
				) : null}
			</div>

			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder={t("editor.bookPicker.searchPlaceholder")}
			/>

			<Tabs
				value={testament}
				onValueChange={(value) => setTestament(value as "ALL" | "OT" | "NT")}
			>
				<TabsList className="w-full justify-start">
					{TESTAMENT_OPTIONS.map((option) => (
						<TabsTrigger key={option.value} value={option.value}>
							{t(option.labelKey)}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
				{isPending ? (
					<div className="space-y-1.5">
						{Array.from({ length: 8 }).map((_, index) => (
							<div key={index} className="h-12 animate-pulse rounded-md bg-muted" />
						))}
					</div>
				) : books.length === 0 ? (
					<p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
						{t("editor.bookPicker.empty")}
					</p>
				) : (
					books.map((book) => {
						const isInPlan = excludedSet.has(book.id);
						const isSelected = selectedSet.has(book.id);
						return (
							<button
								key={book.id}
								type="button"
								disabled={isInPlan}
								onClick={() => toggleBook(book.id)}
								className={cn(
									"flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
									isInPlan
										? "border-border bg-muted/40 text-muted-foreground"
										: isSelected
											? "border-primary bg-primary/5"
											: "border-border bg-background hover:bg-accent",
								)}
							>
								<span className="flex min-w-0 items-center gap-3">
									<span
										className={cn(
											"flex size-5 items-center justify-center rounded border",
											isSelected
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-background",
										)}
										aria-hidden
									>
										{isSelected ? <CheckIcon className="size-3.5" /> : null}
									</span>
									<span className="min-w-0">
										<span className="block truncate font-medium">{book.name}</span>
										<span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
											<Badge status={book.testament === "OT" ? "warning" : "info"}>
												{book.testament}
											</Badge>
											{t("editor.bookPicker.chaptersCount", {
												count: book.chapterCount,
											})}
										</span>
									</span>
								</span>
								{isInPlan ? (
									<span className="text-xs text-muted-foreground">
										{t("editor.bookPicker.inPlan")}
									</span>
								) : null}
							</button>
						);
					})
				)}
			</div>
		</Card>
	);
}
