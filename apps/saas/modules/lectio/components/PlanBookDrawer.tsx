"use client";

import { PlanStatusBadge } from "@lectio/components/PlanStatusBadge";
import { ReadingLogListItem } from "@lectio/components/ReadingLogListItem";
import {
	RESOURCE_TYPE_OPTIONS,
	STATUS_ORDER,
	type PlanBookResourceType,
	type PlanBookStatus,
} from "@lectio/lib/constants";
import {
	useBookChaptersQuery,
	useCreateReadingLogMutation,
	useDeleteReadingLogMutation,
	useReadingLogsQuery,
	useRemovePlanBookMutation,
	useUpdatePlanBookMutation,
	type PlanBookRow,
} from "@lectio/hooks/use-lectio";
import {
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	Textarea,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useConfirmationAlert } from "@shared/components/ConfirmationAlertProvider";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface ReadingLogFormState {
	chapter: string;
	verseStart: string;
	verseEnd: string;
	note: string;
	loggedAt: string;
}

interface PlanBookDrawerProps {
	planId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planBook: PlanBookRow | null;
	/** "log" hides plan-editing sections and shows only reading log capture (plus Bible.com). */
	variant?: "full" | "log";
}

function getTodayDateString() {
	return new Date().toISOString().slice(0, 10);
}

function toNullableString(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function toOptionalPositiveInt(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}

	const number = Number.parseInt(trimmed, 10);
	if (!Number.isInteger(number) || number <= 0) {
		return undefined;
	}

	return number;
}

export function PlanBookDrawer({
	planId,
	open,
	onOpenChange,
	planBook,
	variant = "full",
}: PlanBookDrawerProps) {
	const t = useTranslations("lectio");
	const { confirm } = useConfirmationAlert();
	const updateMutation = useUpdatePlanBookMutation(planId);
	const removeMutation = useRemovePlanBookMutation(planId);
	const createLogMutation = useCreateReadingLogMutation(planId);
	const deleteLogMutation = useDeleteReadingLogMutation(planId, planBook?.id ?? "");
	const { data: logs = [] } = useReadingLogsQuery(planId, planBook?.id ?? "");
	const isLogOnly = variant === "log";
	const { data: chaptersData } = useBookChaptersQuery(planBook?.bookId ?? null);
	const chapters = chaptersData?.chapters ?? [];

	const [resourceUrl, setResourceUrl] = useState("");
	const [resourceLabel, setResourceLabel] = useState("");
	const [resourceType, setResourceType] = useState<PlanBookResourceType | "">("");
	const [status, setStatus] = useState<PlanBookStatus>("not_started");
	const [notes, setNotes] = useState("");
	const [readingLogForm, setReadingLogForm] = useState<ReadingLogFormState>({
		chapter: "",
		verseStart: "",
		verseEnd: "",
		note: "",
		loggedAt: getTodayDateString(),
	});

	useEffect(() => {
		if (!planBook) {
			return;
		}

		setResourceUrl(planBook.resourceUrl ?? "");
		setResourceLabel(planBook.resourceLabel ?? "");
		setResourceType((planBook.resourceType as PlanBookResourceType | null) ?? "");
		setStatus(planBook.status as PlanBookStatus);
		setNotes(planBook.notes ?? "");
		setReadingLogForm({
			chapter: "",
			verseStart: "",
			verseEnd: "",
			note: "",
			loggedAt: getTodayDateString(),
		});
	}, [planBook]);

	const selectedChapter = Number.parseInt(readingLogForm.chapter, 10);
	const selectedChapterData = useMemo(
		() => chapters.find((chapter) => chapter.chapterNum === selectedChapter),
		[chapters, selectedChapter],
	);

	const verseOptions = useMemo(() => {
		if (!selectedChapterData) {
			return [];
		}

		return Array.from({ length: selectedChapterData.verseCount }, (_, index) => index + 1);
	}, [selectedChapterData]);

	const hasUnsavedMetaChanges =
		!!planBook &&
		(resourceUrl !== (planBook.resourceUrl ?? "") ||
			resourceLabel !== (planBook.resourceLabel ?? "") ||
			resourceType !== ((planBook.resourceType as PlanBookResourceType | null) ?? "") ||
			status !== planBook.status ||
			notes !== (planBook.notes ?? ""));

	if (!planBook) {
		return null;
	}

	const handleSaveMetadata = async () => {
		try {
			await updateMutation.mutateAsync({
				planBookId: planBook.id,
				resourceUrl: toNullableString(resourceUrl),
				resourceLabel: toNullableString(resourceLabel),
				resourceType: resourceType || null,
				status,
				notes: toNullableString(notes),
			});
			toastSuccess(t("toast.saved"));
		} catch {
			toastError(t("toast.saveError"));
		}
	};

	const handleAddReadingLog = async () => {
		const chapter = Number.parseInt(readingLogForm.chapter, 10);
		if (!Number.isInteger(chapter) || chapter <= 0) {
			toastError(t("builder.drawer.readingLog.chapterRequired"));
			return;
		}

		const verseStart = toOptionalPositiveInt(readingLogForm.verseStart);
		const verseEnd = toOptionalPositiveInt(readingLogForm.verseEnd);

		if ((verseStart && !verseEnd) || (!verseStart && verseEnd)) {
			toastError(t("builder.drawer.readingLog.verseRangeIncomplete"));
			return;
		}

		if (verseStart && verseEnd && verseStart > verseEnd) {
			toastError(t("builder.drawer.readingLog.verseRangeInvalid"));
			return;
		}

		try {
			await createLogMutation.mutateAsync({
				planBookId: planBook.id,
				chapter,
				verseStart,
				verseEnd,
				note: toNullableString(readingLogForm.note) ?? undefined,
				loggedAt: readingLogForm.loggedAt,
			});
			toastSuccess(t("toast.saved"));
			setReadingLogForm((current) => ({
				...current,
				verseStart: "",
				verseEnd: "",
				note: "",
			}));
		} catch {
			toastError(t("toast.saveError"));
		}
	};

	const handleDeleteReadingLog = async (logId: string) => {
		try {
			await deleteLogMutation.mutateAsync({ readingLogId: logId });
			toastSuccess(t("toast.saved"));
		} catch {
			toastError(t("toast.saveError"));
		}
	};

	const handleRemoveFromPlan = async () => {
		confirm({
			title: t("builder.drawer.remove.confirmTitle"),
			message: t("builder.drawer.remove.confirmMessage"),
			destructive: true,
			confirmLabel: t("builder.drawer.remove.confirmAction"),
			onConfirm: async () => {
				await removeMutation.mutateAsync({ planBookId: planBook.id });
				onOpenChange(false);
			},
		});
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="p-0 flex h-full w-full flex-col sm:max-w-[560px]">
				<SheetHeader className="gap-1 border-b px-6 py-4">
					<SheetTitle className="text-xl">{planBook.book.name}</SheetTitle>
					<SheetDescription>
						{isLogOnly
							? t("builder.drawer.logVariantSubtitle")
							: t("builder.drawer.subtitle", {
									position: planBook.orderIndex + 1,
								})}
					</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
					{!isLogOnly ? (
					<section className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-base">{t("builder.drawer.resource.title")}</h3>
							{planBook.resourceUrl ? (
								<Button variant="outline" size="sm" asChild>
									<a
										href={planBook.resourceUrl}
										target="_blank"
										rel="noreferrer"
										className="gap-1 inline-flex items-center"
									>
										<ExternalLinkIcon className="size-4" />
										{t("builder.drawer.resource.open")}
									</a>
								</Button>
							) : null}
						</div>
						<div className="space-y-3">
							<div className="space-y-1">
								<label className="font-medium text-sm">
									{t("builder.drawer.resource.url")}
								</label>
								<Input
									value={resourceUrl}
									onChange={(event) => setResourceUrl(event.target.value)}
									placeholder="https://..."
								/>
							</div>
							<div className="space-y-1">
								<label className="font-medium text-sm">
									{t("builder.drawer.resource.label")}
								</label>
								<Input
									value={resourceLabel}
									onChange={(event) => setResourceLabel(event.target.value)}
									placeholder={t("builder.drawer.resource.labelPlaceholder")}
								/>
							</div>
							<div className="space-y-1">
								<label className="font-medium text-sm">
									{t("builder.drawer.resource.type")}
								</label>
								<Select
									value={resourceType || "none"}
									onValueChange={(value) =>
										setResourceType(
											value === "none" ? "" : (value as PlanBookResourceType),
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">{t("builder.drawer.resource.none")}</SelectItem>
										{RESOURCE_TYPE_OPTIONS.map((resourceType) => (
											<SelectItem key={resourceType} value={resourceType}>
												{t(`resourceTypes.${resourceType}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>
					) : null}

					{!isLogOnly ? (
					<section className="space-y-4">
						<h3 className="font-semibold text-base">{t("builder.drawer.status.title")}</h3>
						<div className="space-y-2">
							<Select value={status} onValueChange={(value) => setStatus(value as PlanBookStatus)}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUS_ORDER.map((statusKey) => (
										<SelectItem key={statusKey} value={statusKey}>
											{t(`status.${statusKey}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="flex items-center gap-2">
								<PlanStatusBadge status={status} />
							</div>
						</div>
					</section>
					) : null}

					{!isLogOnly ? (
					<section className="space-y-3">
						<h3 className="font-semibold text-base">{t("builder.drawer.notes.title")}</h3>
						<Textarea
							value={notes}
							onChange={(event) => setNotes(event.target.value)}
							placeholder={t("builder.drawer.notes.placeholder")}
							rows={5}
						/>
					</section>
					) : null}

					<section className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-base">
								{t("builder.drawer.readingLog.title")}
							</h3>
							<span className="text-sm text-muted-foreground">
								{t("builder.drawer.readingLog.count", { count: logs.length })}
							</span>
						</div>

						<div className="space-y-3 rounded-2xl border p-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="font-medium text-sm">
										{t("builder.drawer.readingLog.chapter")}
									</label>
									<Select
										value={readingLogForm.chapter || "none"}
										onValueChange={(value) =>
											setReadingLogForm((current) => ({
												...current,
												chapter: value === "none" ? "" : value,
												verseStart: "",
												verseEnd: "",
											}))
										}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={t("builder.drawer.readingLog.selectChapter")}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												{t("builder.drawer.readingLog.selectChapter")}
											</SelectItem>
											{chapters.map((chapter) => (
												<SelectItem
													key={chapter.id}
													value={`${chapter.chapterNum}`}
												>
													{chapter.chapterNum}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<label className="font-medium text-sm">
										{t("builder.drawer.readingLog.date")}
									</label>
									<Input
										type="date"
										value={readingLogForm.loggedAt}
										onChange={(event) =>
											setReadingLogForm((current) => ({
												...current,
												loggedAt: event.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<label className="font-medium text-sm">
										{t("builder.drawer.readingLog.verseFrom")}
									</label>
									<Select
										value={readingLogForm.verseStart || "none"}
										onValueChange={(value) =>
											setReadingLogForm((current) => ({
												...current,
												verseStart: value === "none" ? "" : value,
											}))
										}
										disabled={verseOptions.length === 0}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={t("builder.drawer.readingLog.optional")}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												{t("builder.drawer.readingLog.optional")}
											</SelectItem>
											{verseOptions.map((verse) => (
												<SelectItem key={verse} value={`${verse}`}>
													{verse}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<label className="font-medium text-sm">
										{t("builder.drawer.readingLog.verseTo")}
									</label>
									<Select
										value={readingLogForm.verseEnd || "none"}
										onValueChange={(value) =>
											setReadingLogForm((current) => ({
												...current,
												verseEnd: value === "none" ? "" : value,
											}))
										}
										disabled={verseOptions.length === 0}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={t("builder.drawer.readingLog.optional")}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">
												{t("builder.drawer.readingLog.optional")}
											</SelectItem>
											{verseOptions.map((verse) => (
												<SelectItem key={verse} value={`${verse}`}>
													{verse}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="space-y-1">
								<label className="font-medium text-sm">
									{t("builder.drawer.readingLog.note")}
								</label>
								<Textarea
									rows={3}
									value={readingLogForm.note}
									onChange={(event) =>
										setReadingLogForm((current) => ({
											...current,
											note: event.target.value,
										}))
									}
									placeholder={t("builder.drawer.readingLog.notePlaceholder")}
								/>
							</div>

							<div className="flex justify-end">
								<Button
									type="button"
									onClick={handleAddReadingLog}
									loading={createLogMutation.isPending}
								>
									<PlusIcon className="mr-1.5 size-4" />
									{t("builder.drawer.readingLog.add")}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							{logs.length === 0 ? (
								<p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
									{t("builder.drawer.readingLog.empty")}
								</p>
							) : (
								logs.map((log) => (
									<ReadingLogListItem
										key={log.id}
										bookName={planBook.book.name}
										log={log}
										deleteLabel={t("builder.drawer.readingLog.delete")}
										onDelete={handleDeleteReadingLog}
									/>
								))
							)}
						</div>
					</section>
				</div>

				<SheetFooter
					className={`mt-auto border-t px-6 py-4 sm:space-x-0 ${isLogOnly ? "sm:justify-end" : "sm:justify-between"}`}
				>
					{isLogOnly ? (
						<Button variant="outline" asChild>
							<a
								href={`https://www.bible.com/bible/3034/${planBook.book.usfmCode}.1`}
								target="_blank"
								rel="noreferrer"
							>
								{t("builder.drawer.readOnBibleCom")}
							</a>
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="destructive"
								onClick={handleRemoveFromPlan}
								loading={removeMutation.isPending}
							>
								{t("builder.drawer.remove.action")}
							</Button>

							<div className="flex items-center gap-2">
								<Button variant="outline" asChild>
									<a
										href={`https://www.bible.com/bible/3034/${planBook.book.usfmCode}.1`}
										target="_blank"
										rel="noreferrer"
									>
										{t("builder.drawer.readOnBibleCom")}
									</a>
								</Button>
								<Button
									type="button"
									onClick={handleSaveMetadata}
									disabled={!hasUnsavedMetaChanges}
									loading={updateMutation.isPending}
								>
									{t("builder.drawer.save")}
								</Button>
							</div>
						</>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
