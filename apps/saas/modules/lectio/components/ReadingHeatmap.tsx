"use client";

import type { StatsActivityResponse } from "@lectio/hooks/use-lectio";
import { cn } from "@repo/ui";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";

interface ReadingHeatmapProps {
	data: StatsActivityResponse;
	className?: string;
}

const BUCKETS = [
	"bg-muted/40",
	"bg-primary/20",
	"bg-primary/40",
	"bg-primary/60",
	"bg-primary/80",
] as const;

function bucketFor(count: number) {
	if (count <= 0) return BUCKETS[0];
	if (count === 1) return BUCKETS[1];
	if (count <= 3) return BUCKETS[2];
	if (count <= 6) return BUCKETS[3];
	return BUCKETS[4];
}

interface Week {
	monthLabel: string | null;
	cells: Array<{
		date: string;
		count: number;
		// JS day-of-week (0 = Sunday).
		dow: number;
	} | null>;
}

function buildWeeks(days: StatsActivityResponse["days"]): Week[] {
	if (days.length === 0) return [];
	const weeks: Week[] = [];
	let currentCells: Array<Week["cells"][number]> = [];
	let currentMonth: string | null = null;

	const firstDate = new Date(`${days[0].date}T00:00:00Z`);
	const startDow = firstDate.getUTCDay();
	for (let i = 0; i < startDow; i += 1) currentCells.push(null);

	for (const day of days) {
		const date = new Date(`${day.date}T00:00:00Z`);
		const dow = date.getUTCDay();

		if (dow === 0 && currentCells.length > 0) {
			weeks.push({ monthLabel: currentMonth, cells: currentCells });
			currentCells = [];
			currentMonth = null;
		}

		if (date.getUTCDate() <= 7 && currentMonth === null) {
			currentMonth = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
		}

		currentCells.push({ date: day.date, count: day.count, dow });
	}

	if (currentCells.length > 0) {
		while (currentCells.length < 7) currentCells.push(null);
		weeks.push({ monthLabel: currentMonth, cells: currentCells });
	}

	return weeks;
}

export function ReadingHeatmap({ data, className }: ReadingHeatmapProps) {
	const t = useTranslations("lectio.heatmap");
	const format = useFormatter();
	const weeks = useMemo(() => buildWeeks(data.days), [data.days]);
	const totalEntries = useMemo(
		() => data.days.reduce((sum, day) => sum + day.count, 0),
		[data.days],
	);

	return (
		<div className={cn("space-y-3", className)}>
			<div className="gap-3 flex flex-wrap items-baseline justify-between">
				<h2 className="font-semibold text-base">{t("title")}</h2>
				<p className="text-xs text-muted-foreground">
					{t("totalEntries", { count: totalEntries })}
				</p>
			</div>

			<TooltipProvider delayDuration={120}>
				<div className="overflow-x-auto">
					<div className="gap-3 flex">
						{/* Weekday labels */}
						<div className="gap-[3px] hidden sm:flex sm:flex-col text-xs text-muted-foreground pt-4">
							{["Mon", "Wed", "Fri"].map((label, idx) => (
								<span
									key={label}
									className={cn(
										"size-3 leading-3",
										// Stack the labels at row 1, 3, 5 to mirror github's layout.
										idx === 0 && "mt-[14px]",
										idx > 0 && "mt-[10px]",
									)}
								>
									{label}
								</span>
							))}
						</div>

						<div className="space-y-1">
							{/* Month labels */}
							<div className="gap-[3px] flex">
								{weeks.map((week, idx) => (
									<span
										key={idx}
										className="size-3 text-[10px] uppercase tracking-wide text-muted-foreground leading-3"
										aria-hidden
									>
										{week.monthLabel ?? ""}
									</span>
								))}
							</div>
							{/* Cells */}
							<div className="gap-[3px] flex">
								{weeks.map((week, weekIdx) => (
									<div key={weekIdx} className="gap-[3px] flex flex-col">
										{Array.from({ length: 7 }).map((_, dow) => {
											const cell = week.cells[dow];
											if (!cell) {
												return (
													<span
														key={dow}
														className="size-3 rounded-[3px] bg-transparent"
														aria-hidden
													/>
												);
											}
											const dateLabel = format.dateTime(new Date(`${cell.date}T00:00:00Z`), {
												dateStyle: "medium",
											});
											return (
												<Tooltip key={dow}>
													<TooltipTrigger asChild>
														<span
															className={cn(
																"size-3 rounded-[3px] inline-block transition-colors",
																bucketFor(cell.count),
															)}
															aria-label={t("cellLabel", {
																date: dateLabel,
																count: cell.count,
															})}
														/>
													</TooltipTrigger>
													<TooltipContent side="top">
														<p className="text-xs font-medium">
															{t("cellLabel", { date: dateLabel, count: cell.count })}
														</p>
													</TooltipContent>
												</Tooltip>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</TooltipProvider>

			<div className="gap-2 flex items-center justify-end text-xs text-muted-foreground">
				<span>{t("less")}</span>
				{BUCKETS.map((cls) => (
					<span key={cls} className={cn("size-3 rounded-[3px]", cls)} />
				))}
				<span>{t("more")}</span>
			</div>
		</div>
	);
}
