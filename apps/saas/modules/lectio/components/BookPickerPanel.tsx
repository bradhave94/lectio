"use client";

import { TESTAMENT_OPTIONS } from "@lectio/lib/constants";
import { useAddPlanBookMutation, useBooksQuery, type BuilderResponse } from "@lectio/hooks/use-lectio";
import { Badge, Button, Card, Input, Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

interface BookPickerPanelProps {
	planId: string;
	planBooks: BuilderResponse["planBooks"];
}

export function BookPickerPanel({ planId, planBooks }: BookPickerPanelProps) {
	const t = useTranslations("lectio");
	const [search, setSearch] = useState("");
	const [testament, setTestament] = useState<"ALL" | "OT" | "NT">("ALL");
	const addPlanBookMutation = useAddPlanBookMutation(planId);

	const { data: books = [], isPending } = useBooksQuery({
		search,
		testament: testament === "ALL" ? undefined : testament,
	});

	const addedBookIds = useMemo(() => new Set(planBooks.map((planBook) => planBook.bookId)), [planBooks]);

	return (
		<Card className="p-5 md:p-6">
			<div className="space-y-4">
				<div>
					<h2 className="font-semibold text-lg">{t("builder.bookPicker.title")}</h2>
				</div>

				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={t("builder.bookPicker.searchPlaceholder")}
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

				<div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
					{isPending ? (
						<div className="space-y-2">
							{Array.from({ length: 8 }).map((_, index) => (
								<div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
							))}
						</div>
					) : books.length === 0 ? (
						<p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
							{t("builder.bookPicker.empty")}
						</p>
					) : (
						books.map((book) => {
							const isAdded = addedBookIds.has(book.id);

							return (
								<div
									key={book.id}
									className="flex items-center justify-between gap-3 rounded-xl border p-3"
								>
									<div className={isAdded ? "opacity-60" : ""}>
										<p className="font-medium">{book.name}</p>
										<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
											<Badge status={book.testament === "OT" ? "warning" : "info"}>
												{book.testament}
											</Badge>
											<span>
												{t("builder.bookPicker.chaptersCount", {
													count: book.chapterCount,
												})}
											</span>
										</div>
									</div>

									<Button
										type="button"
										size="sm"
										variant={isAdded ? "secondary" : "outline"}
										disabled={isAdded || addPlanBookMutation.isPending}
										onClick={() => addPlanBookMutation.mutate({ planId, bookId: book.id })}
									>
										{isAdded ? (
											<>
												<CheckIcon className="mr-1.5 size-4" />
												{t("builder.bookPicker.alreadyAdded")}
											</>
										) : (
											<>
												<PlusIcon className="mr-1.5 size-4" />
												{t("builder.bookPicker.add")}
											</>
										)}
									</Button>
								</div>
							);
						})
					)}
				</div>
			</div>
		</Card>
	);
}
