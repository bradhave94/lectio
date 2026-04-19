"use client";

import { useLogReading } from "@lectio/components/LogReadingProvider";
import { cn } from "@repo/ui";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface LogReadingFabProps {
	hidden?: boolean;
}

/**
 * Floating action button anchored to the bottom-right that opens the
 * Log Reading dialog. Mounted globally inside `LogReadingProvider` so it
 * appears on every Lectio surface.
 */
export function LogReadingFab({ hidden = false }: LogReadingFabProps) {
	const t = useTranslations("lectio.fab");
	const { openLogReading } = useLogReading();

	if (hidden) {
		return null;
	}

	return (
		<button
			type="button"
			aria-label={t("logReading")}
			onClick={() => openLogReading()}
			className={cn(
				"size-14 fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full",
				"bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden",
				"pb-[env(safe-area-inset-bottom)]",
			)}
		>
			<PlusIcon className="size-6" />
		</button>
	);
}
