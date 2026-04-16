"use client";

import { BookPickerPanel } from "@lectio/components/BookPickerPanel";
import {
	colorTokens,
	iconForKey,
	PLAN_COLOR_KEYS,
	PLAN_COLORS,
	PLAN_ICON_KEYS,
	type PlanColorKey,
	type PlanIconKey,
} from "@lectio/lib/constants";
import { useCreatePlanMutation } from "@lectio/hooks/use-lectio";
import {
	Button,
	cn,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface PlanComposerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type Step = "basics" | "personalize" | "books";

export function PlanComposerDialog({ open, onOpenChange }: PlanComposerDialogProps) {
	const t = useTranslations("lectio.composer");
	const tToast = useTranslations("lectio.toast");
	const router = useRouter();
	const createMutation = useCreatePlanMutation();

	const [step, setStep] = useState<Step>("basics");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState<PlanColorKey | null>(null);
	const [icon, setIcon] = useState<PlanIconKey | null>(null);
	const [startDate, setStartDate] = useState("");
	const [targetEndDate, setTargetEndDate] = useState("");
	const [cadence, setCadence] = useState("");
	const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);

	const reset = () => {
		setStep("basics");
		setTitle("");
		setDescription("");
		setColor(null);
		setIcon(null);
		setStartDate("");
		setTargetEndDate("");
		setCadence("");
		setSelectedBookIds([]);
	};

	const handleOpenChange = (next: boolean) => {
		onOpenChange(next);
		if (!next) {
			// Defer reset until after close animation finishes.
			setTimeout(reset, 250);
		}
	};

	const canSubmit = title.trim().length > 0;

	const handleSubmit = async () => {
		if (!canSubmit) {
			return;
		}

		try {
			const created = await createMutation.mutateAsync({
				title: title.trim(),
				description: description.trim() ? description.trim() : null,
				color: color ?? null,
				icon: icon ?? null,
				startDate: startDate || null,
				targetEndDate: targetEndDate || null,
				cadence: cadence.trim() ? cadence.trim() : null,
				books: selectedBookIds.map((bookId) => ({ bookId })),
			});

			toastSuccess(tToast("saved"));
			handleOpenChange(false);
			router.push(`/plans/${created.id}`);
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const Icon = iconForKey(icon);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("subtitle")}</DialogDescription>
				</DialogHeader>

				<Tabs value={step} onValueChange={(value) => setStep(value as Step)} className="flex flex-1 min-h-0 flex-col">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="basics">{t("steps.basics")}</TabsTrigger>
						<TabsTrigger value="personalize">{t("steps.personalize")}</TabsTrigger>
						<TabsTrigger value="books">{t("steps.books")}</TabsTrigger>
					</TabsList>

					<div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1 -mr-1">
						<TabsContent value="basics" className="space-y-4 mt-0">
							<div className="space-y-1.5">
								<Label htmlFor="composer-title">{t("titleLabel")}</Label>
								<Input
									id="composer-title"
									value={title}
									onChange={(event) => setTitle(event.target.value)}
									maxLength={160}
									placeholder={t("titlePlaceholder")}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="composer-description">{t("descriptionLabel")}</Label>
								<Textarea
									id="composer-description"
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									maxLength={2000}
									rows={4}
									placeholder={t("descriptionPlaceholder")}
								/>
							</div>
						</TabsContent>

						<TabsContent value="personalize" className="space-y-5 mt-0">
							<div className="space-y-2">
								<Label>{t("colorLabel")}</Label>
								<div className="flex flex-wrap gap-2">
									{PLAN_COLOR_KEYS.map((key) => {
										const tokens = PLAN_COLORS[key];
										const selected = color === key;
										return (
											<button
												key={key}
												type="button"
												onClick={() => setColor(selected ? null : key)}
												className={cn(
													"flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
													selected
														? cn("border-primary", tokens.soft)
														: "border-border bg-background hover:bg-accent",
												)}
											>
												<span className={cn("size-3 rounded-full", tokens.swatch)} />
												{tokens.label}
											</button>
										);
									})}
								</div>
							</div>

							<div className="space-y-2">
								<Label>{t("iconLabel")}</Label>
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
									<Label htmlFor="composer-start">{t("startDateLabel")}</Label>
									<Input
										id="composer-start"
										type="date"
										value={startDate}
										onChange={(event) => setStartDate(event.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="composer-end">{t("targetEndLabel")}</Label>
									<Input
										id="composer-end"
										type="date"
										value={targetEndDate}
										onChange={(event) => setTargetEndDate(event.target.value)}
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="composer-cadence">{t("cadenceLabel")}</Label>
								<Input
									id="composer-cadence"
									value={cadence}
									onChange={(event) => setCadence(event.target.value)}
									maxLength={80}
									placeholder={t("cadencePlaceholder")}
								/>
							</div>

							<div className={cn("rounded-lg border p-3", colorTokens(color).border, colorTokens(color).soft)}>
								<div className="flex items-center gap-2">
									<Icon className={cn("size-5", colorTokens(color).text)} />
									<p className="font-medium">{title || t("preview.placeholderTitle")}</p>
								</div>
								<p className="mt-1 text-xs text-muted-foreground">{t("preview.help")}</p>
							</div>
						</TabsContent>

						<TabsContent value="books" className="mt-0">
							<BookPickerPanel
								selectedBookIds={selectedBookIds}
								onSelectionChange={setSelectedBookIds}
							/>
						</TabsContent>
					</div>
				</Tabs>

				<DialogFooter className="border-t pt-4 sm:justify-between">
					<Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
						{t("cancel")}
					</Button>
					<div className="flex items-center gap-2">
						{step !== "basics" ? (
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setStep(step === "personalize" ? "basics" : "personalize")
								}
							>
								{t("back")}
							</Button>
						) : null}
						{step !== "books" ? (
							<Button
								type="button"
								onClick={() =>
									setStep(step === "basics" ? "personalize" : "books")
								}
								disabled={step === "basics" && !canSubmit}
							>
								{t("next")}
							</Button>
						) : (
							<Button
								type="button"
								onClick={handleSubmit}
								loading={createMutation.isPending}
								disabled={!canSubmit}
							>
								{t("create")}
							</Button>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
