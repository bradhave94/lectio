"use client";

import type { VerseOfDayResponse } from "@lectio/hooks/use-lectio";
import { Card } from "@repo/ui";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface VerseOfDayBannerProps {
	verseOfDay: VerseOfDayResponse;
}

export function VerseOfDayBanner({ verseOfDay }: VerseOfDayBannerProps) {
	const t = useTranslations("lectio.verseOfDay");

	if (!verseOfDay) {
		return (
			<Card className="p-5">
				<p className="text-sm text-muted-foreground">{t("unavailable")}</p>
			</Card>
		);
	}

	return (
		<Card className="p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm font-medium text-muted-foreground">{t("title")}</p>
					<p className="mt-1 text-lg font-semibold">
						{verseOfDay.usfmCode} {verseOfDay.chapter}
					</p>
				</div>
				<a
					href={verseOfDay.bibleDotComUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center text-sm text-primary hover:underline"
				>
					{t("openBibleCom")}
					<ExternalLinkIcon className="ml-1 size-4" />
				</a>
			</div>
		</Card>
	);
}
