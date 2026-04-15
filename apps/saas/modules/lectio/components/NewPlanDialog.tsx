"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Textarea,
} from "@repo/ui";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";

const formSchema = z.object({
	title: z.string().trim().min(1).max(160),
	description: z.string().trim().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPlanDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isSubmitting: boolean;
	onSubmit: (values: { title: string; description: string | null }) => Promise<void>;
}

export function NewPlanDialog({
	open,
	onOpenChange,
	isSubmitting,
	onSubmit,
}: NewPlanDialogProps) {
	const t = useTranslations("lectio.newPlanDialog");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			description: "",
		},
	});

	const submit = form.handleSubmit(async (values) => {
		await onSubmit({
			title: values.title.trim(),
			description: values.description?.trim() ? values.description.trim() : null,
		});
		form.reset();
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>

				<form className="space-y-4" onSubmit={submit}>
					<div className="space-y-1.5">
						<label className="font-medium text-sm" htmlFor="new-plan-title">
							{t("titleLabel")}
						</label>
						<Controller
							control={form.control}
							name="title"
							render={({ field }) => (
								<Input
									{...field}
									id="new-plan-title"
									placeholder={t("titlePlaceholder")}
									maxLength={160}
								/>
							)}
						/>
					</div>

					<div className="space-y-1.5">
						<label className="font-medium text-sm" htmlFor="new-plan-description">
							{t("descriptionLabel")}
						</label>
						<Controller
							control={form.control}
							name="description"
							render={({ field }) => (
								<Textarea
									{...field}
									id="new-plan-description"
									placeholder={t("descriptionPlaceholder")}
									maxLength={2000}
									rows={4}
								/>
							)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{t("cancel")}
						</Button>
						<Button type="submit" loading={isSubmitting}>
							{t("create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
