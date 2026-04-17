"use client";

import type { VerseOfDayResponse } from "@lectio/hooks/use-lectio";
import { Card } from "@repo/ui";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
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

	const reference = verseOfDay.reference ?? `${verseOfDay.usfmCode} ${verseOfDay.chapter}`;
	const content = verseOfDay.content;

	return (
		<Card className="p-5 sm:p-6 space-y-4">
			<div className="gap-2 flex items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
				<SparklesIcon className="size-3.5" />
				{t("title")}
			</div>

			{content ? (
				<blockquote className="text-base sm:text-lg italic leading-relaxed text-foreground">
					&ldquo;{content}&rdquo;
				</blockquote>
			) : (
				<p className="text-sm text-muted-foreground">{t("contentUnavailable")}</p>
			)}

			<div className="gap-3 flex flex-wrap items-center justify-between">
				<p className="font-semibold text-sm">— {reference}</p>
				<a
					href={verseOfDay.bibleDotComUrl}
					target="_blank"
					rel="noreferrer"
					className="text-sm inline-flex items-center text-primary hover:underline"
				>
					{t("openBibleCom")}
					<ExternalLinkIcon className="ml-1 size-4" />
				</a>
			</div>
		</Card>
	);
}
