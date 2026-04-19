"use client";

import { useCreatePlanMutation } from "@lectio/hooks/use-lectio";
import { Button, type ButtonProps } from "@repo/ui";
import { toastError } from "@repo/ui/components/toast";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface NewPlanButtonProps extends Omit<ButtonProps, "onClick" | "type" | "loading"> {
	label?: string;
	icon?: boolean;
}

/**
 * Creates a placeholder plan and immediately redirects to its editor. The
 * editor is a full surface (not a modal) so users can fill in title /
 * description / books with more room.
 */
export function NewPlanButton({
	label,
	icon = true,
	variant = "outline",
	size,
	className,
	...buttonProps
}: NewPlanButtonProps) {
	const t = useTranslations("lectio");
	const tToast = useTranslations("lectio.toast");
	const router = useRouter();
	const createMutation = useCreatePlanMutation();

	const fallbackLabel = t("home.newPlan");

	const handleClick = async () => {
		try {
			const created = await createMutation.mutateAsync({
				title: t("composer.untitled"),
			});
			router.push(`/plans/${created.id}/edit`);
		} catch {
			toastError(tToast("saveError"));
		}
	};

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			className={className}
			onClick={handleClick}
			loading={createMutation.isPending}
			{...buttonProps}
		>
			{icon ? <PlusIcon className="mr-1.5 size-4" /> : null}
			{label ?? fallbackLabel}
		</Button>
	);
}
