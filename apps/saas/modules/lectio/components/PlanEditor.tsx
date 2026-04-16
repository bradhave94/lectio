"use client";

import { BookPickerPanel } from "@lectio/components/BookPickerPanel";
import { PlanBuilderDndList } from "@lectio/components/PlanBuilderDndList";
import {
	colorTokens,
	iconForKey,
	PLAN_COLOR_KEYS,
	PLAN_COLORS,
	PLAN_ICON_KEYS,
	type PlanColorKey,
	type PlanIconKey,
} from "@lectio/lib/constants";
import {
	useAddPlanBooksMutation,
	usePlanBuilderQuery,
	useRemovePlanBookMutation,
	useReorderPlanBooksMutation,
	useUpdatePlanBookMutation,
	useUpdatePlanMutation,
	type BuilderResponse,
	type PlanBookRow,
} from "@lectio/hooks/use-lectio";
import {
	Button,
	Card,
	cn,
	Input,
	Label,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
	Textarea,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import {
	ArrowLeftIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface PlanEditorProps {
	planId: string;
	initialData: BuilderResponse;
}

interface ScopeState {
	whole: boolean;
	start: string;
	end: string;
}

function scopeStateFromRow(row: PlanBookRow): ScopeState {
	const whole = row.chapterStart == null || row.chapterEnd == null;
	return {
		whole,
		start: whole ? "1" : `${row.chapterStart}`,
		end: whole ? `${row.book.chapterCount}` : `${row.chapterEnd}`,
	};
}

export function PlanEditor({ planId, initialData }: PlanEditorProps) {
	const t = useTranslations("lectio");
	const tToast = useTranslations("lectio.toast");
	const { confirm } = useConfirmationAlert();

	const { data } = usePlanBuilderQuery(planId, initialData);
	const builder = data ?? initialData;

	const updatePlan = useUpdatePlanMutation(planId);
	const addBooks = useAddPlanBooksMutation(planId);
	const removeBook = useRemovePlanBookMutation(planId);
	const reorder = useReorderPlanBooksMutation(planId);
	const updateBook = useUpdatePlanBookMutation(planId);

	const [title, setTitle] = useState(builder.plan.title);
	const [description, setDescription] = useState(builder.plan.description ?? "");
	const [color, setColor] = useState<PlanColorKey | null>(
		(builder.plan.color as PlanColorKey | null) ?? null,
	);
	const [icon, setIcon] = useState<PlanIconKey | null>(
		(builder.plan.icon as PlanIconKey | null) ?? null,
	);
	const [startDate, setStartDate] = useState(builder.plan.startDate ?? "");
	const [targetEndDate, setTargetEndDate] = useState(builder.plan.targetEndDate ?? "");
	const [cadence, setCadence] = useState(builder.plan.cadence ?? "");
	const [pendingBookIds, setPendingBookIds] = useState<number[]>([]);

	useEffect(() => {
		setTitle(builder.plan.title);
		setDescription(builder.plan.description ?? "");
		setColor((builder.plan.color as PlanColorKey | null) ?? null);
		setIcon((builder.plan.icon as PlanIconKey | null) ?? null);
		setStartDate(builder.plan.startDate ?? "");
		setTargetEndDate(builder.plan.targetEndDate ?? "");
		setCadence(builder.plan.cadence ?? "");
	}, [builder.plan]);

	const tokens = colorTokens(color);
	const Icon = iconForKey(icon);

	const isDirty =
		title.trim() !== builder.plan.title ||
		(description.trim() || null) !== (builder.plan.description ?? null) ||
		color !== ((builder.plan.color as PlanColorKey | null) ?? null) ||
		icon !== ((builder.plan.icon as PlanIconKey | null) ?? null) ||
		(startDate || null) !== (builder.plan.startDate ?? null) ||
		(targetEndDate || null) !== (builder.plan.targetEndDate ?? null) ||
		(cadence.trim() || null) !== (builder.plan.cadence ?? null);

	const existingBookIds = useMemo(
		() => builder.planBooks.map((row) => row.bookId),
		[builder.planBooks],
	);

	const handleSavePlan = async () => {
		try {
			await updatePlan.mutateAsync({
				planId,
				title: title.trim(),
				description: description.trim() ? description.trim() : null,
				color,
				icon,
				startDate: startDate || null,
				targetEndDate: targetEndDate || null,
				cadence: cadence.trim() ? cadence.trim() : null,
			});
			toastSuccess(tToast("saved"));
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleAddSelected = async (bookIds: number[]) => {
		if (bookIds.length === 0) {
			return;
		}
		try {
			await addBooks.mutateAsync({
				planId,
				books: bookIds.map((bookId) => ({ bookId })),
			});
			toastSuccess(tToast("saved"));
			setPendingBookIds([]);
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleReorder = (orderedIds: string[]) => {
		reorder.mutate({ planId, orderedPlanBookIds: orderedIds });
	};

	const handleRemove = (planBook: PlanBookRow) => {
		confirm({
			title: t("editor.removeBook.title"),
			message: t("editor.removeBook.message", { name: planBook.book.name }),
			destructive: true,
			confirmLabel: t("editor.removeBook.confirm"),
			onConfirm: async () => {
				try {
					await removeBook.mutateAsync({ planBookId: planBook.id });
				} catch {
					toastError(tToast("saveError"));
				}
			},
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="space-y-2">
					<Link
						href={`/plans/${planId}`}
						className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeftIcon className="mr-1 size-4" />
						{t("editor.backToJournal")}
					</Link>
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"flex size-9 items-center justify-center rounded-md border",
								tokens.border,
								tokens.soft,
							)}
						>
							<Icon className={cn("size-5", tokens.text)} />
						</span>
						<h1 className="text-2xl font-semibold">
							{title.trim() || t("editor.titleFallback")}
						</h1>
					</div>
				</div>
				<Button onClick={handleSavePlan} loading={updatePlan.isPending} disabled={!isDirty}>
					{t("editor.save")}
				</Button>
			</div>

			<div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
				<BookPickerPanel
					excludedBookIds={existingBookIds}
					selectedBookIds={pendingBookIds}
					onSelectionChange={setPendingBookIds}
					onAddSelected={handleAddSelected}
					isAdding={addBooks.isPending}
				/>

				<div className="space-y-6">
					<Card className="p-5 space-y-5">
						<h2 className="font-semibold text-lg">{t("editor.basicsTitle")}</h2>

						<div className="space-y-1.5">
							<Label htmlFor="editor-title">{t("editor.fields.title")}</Label>
							<Input
								id="editor-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								maxLength={160}
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="editor-description">{t("editor.fields.description")}</Label>
							<Textarea
								id="editor-description"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								maxLength={2000}
								rows={3}
								placeholder={t("editor.fields.descriptionPlaceholder")}
							/>
						</div>

						<div className="space-y-2">
							<Label>{t("editor.fields.color")}</Label>
							<div className="flex flex-wrap gap-2">
								{PLAN_COLOR_KEYS.map((key) => {
									const colorTok = PLAN_COLORS[key];
									const selected = color === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setColor(selected ? null : key)}
											className={cn(
												"flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
												selected
													? cn("border-primary", colorTok.soft)
													: "border-border bg-background hover:bg-accent",
											)}
										>
											<span className={cn("size-3 rounded-full", colorTok.swatch)} />
											{colorTok.label}
										</button>
									);
								})}
							</div>
						</div>

						<div className="space-y-2">
							<Label>{t("editor.fields.icon")}</Label>
							<div className="flex flex-wrap gap-2">
								{PLAN_ICON_KEYS.map((key) => {
									const ChipIcon = iconForKey(key);
									const selected = icon === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => setIcon(selected ? null : key)}
											className={cn(
												"flex size-10 items-center justify-center rounded-md border transition-colors",
												selected
													? "border-primary bg-primary/10"
													: "border-border bg-background hover:bg-accent",
											)}
											aria-label={key}
										>
											<ChipIcon className="size-5" />
										</button>
									);
								})}
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="editor-start">{t("editor.fields.startDate")}</Label>
								<Input
									id="editor-start"
									type="date"
									value={startDate}
									onChange={(event) => setStartDate(event.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="editor-end">{t("editor.fields.targetEnd")}</Label>
								<Input
									id="editor-end"
									type="date"
									value={targetEndDate}
									onChange={(event) => setTargetEndDate(event.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="editor-cadence">{t("editor.fields.cadence")}</Label>
							<Input
								id="editor-cadence"
								value={cadence}
								onChange={(event) => setCadence(event.target.value)}
								maxLength={80}
								placeholder={t("editor.fields.cadencePlaceholder")}
							/>
						</div>
					</Card>

					<Card className="p-5 space-y-4">
						<div>
							<h2 className="font-semibold text-lg">{t("editor.booksTitle")}</h2>
							<p className="text-sm text-muted-foreground">{t("editor.booksHint")}</p>
						</div>

						{builder.planBooks.length === 0 ? (
							<p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
								{t("editor.booksEmpty")}
							</p>
						) : (
							<PlanBuilderDndList
								items={builder.planBooks}
								onReorder={handleReorder}
								renderItem={(planBook, index) => (
									<PlanBookEditorRow
										planBook={planBook}
										index={index}
										onSaveScope={(scope) =>
											updateBook.mutateAsync({
												planBookId: planBook.id,
												chapterStart: scope.chapterStart,
												chapterEnd: scope.chapterEnd,
												clearChapterScope: scope.clear,
											})
										}
										onRemove={() => handleRemove(planBook)}
									/>
								)}
							/>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
}

interface PlanBookEditorRowProps {
	planBook: PlanBookRow;
	index: number;
	onSaveScope: (scope: {
		chapterStart: number | null;
		chapterEnd: number | null;
		clear: boolean;
	}) => Promise<unknown>;
	onRemove: () => void;
}

function PlanBookEditorRow({ planBook, index, onSaveScope, onRemove }: PlanBookEditorRowProps) {
	const t = useTranslations("lectio");
	const [scope, setScope] = useState<ScopeState>(scopeStateFromRow(planBook));
	const [popoverOpen, setPopoverOpen] = useState(false);

	useEffect(() => {
		setScope(scopeStateFromRow(planBook));
	}, [planBook]);

	const scopeLabel =
		planBook.chapterStart == null || planBook.chapterEnd == null
			? t("editor.scope.whole")
			: t("editor.scope.range", {
					start: planBook.chapterStart,
					end: planBook.chapterEnd,
				});

	return (
		<div className="flex items-center justify-between gap-3">
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">#{index + 1}</p>
				<p className="truncate font-medium">{planBook.book.name}</p>
				<p className="text-xs text-muted-foreground">{scopeLabel}</p>
			</div>
			<div className="flex items-center gap-1">
				<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline" size="sm">
							<PencilIcon className="mr-1.5 size-3.5" />
							{t("editor.scope.edit")}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-72 space-y-3" align="end">
						<div className="flex items-center justify-between gap-2">
							<Label htmlFor={`whole-${planBook.id}`} className="cursor-pointer">
								{t("editor.scope.wholeBook")}
							</Label>
							<Switch
								id={`whole-${planBook.id}`}
								checked={scope.whole}
								onCheckedChange={(checked) =>
									setScope((current) => ({
										...current,
										whole: checked,
									}))
								}
							/>
						</div>
						{!scope.whole ? (
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1">
									<Label className="text-xs" htmlFor={`start-${planBook.id}`}>
										{t("editor.scope.start")}
									</Label>
									<Select
										value={scope.start}
										onValueChange={(value) =>
											setScope((current) => ({ ...current, start: value }))
										}
									>
										<SelectTrigger id={`start-${planBook.id}`} />
										<SelectContent className="max-h-64">
											{Array.from({ length: planBook.book.chapterCount }, (_, idx) => (
												<SelectItem key={idx + 1} value={`${idx + 1}`}>
													{idx + 1}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label className="text-xs" htmlFor={`end-${planBook.id}`}>
										{t("editor.scope.end")}
									</Label>
									<Select
										value={scope.end}
										onValueChange={(value) =>
											setScope((current) => ({ ...current, end: value }))
										}
									>
										<SelectTrigger id={`end-${planBook.id}`} />
										<SelectContent className="max-h-64">
											{Array.from({ length: planBook.book.chapterCount }, (_, idx) => (
												<SelectItem key={idx + 1} value={`${idx + 1}`}>
													{idx + 1}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						) : null}
						<div className="flex justify-end gap-2 pt-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPopoverOpen(false)}
							>
								{t("editor.scope.cancel")}
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={async () => {
									if (scope.whole) {
										await onSaveScope({ chapterStart: null, chapterEnd: null, clear: true });
									} else {
										const start = Number.parseInt(scope.start, 10);
										const end = Number.parseInt(scope.end, 10);
										if (
											!Number.isInteger(start) ||
											!Number.isInteger(end) ||
											end < start
										) {
											return;
										}
										await onSaveScope({
											chapterStart: start,
											chapterEnd: end,
											clear: false,
										});
									}
									setPopoverOpen(false);
								}}
							>
								{t("editor.scope.save")}
							</Button>
						</div>
					</PopoverContent>
				</Popover>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={onRemove}
					aria-label={t("editor.removeBook.aria")}
				>
					<Trash2Icon className="size-4 text-destructive" />
				</Button>
			</div>
		</div>
	);
}
