"use client";

import { useStatsDailyGoalQuery, useStatsStreakQuery, type StatsDailyGoalResponse, type StatsStreakResponse } from "@lectio/hooks/use-lectio";
import {
	Button,
	Card,
	cn,
	Input,
	Label,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { FlameIcon, TargetIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useSetDailyGoalMutation } from "@lectio/hooks/use-lectio";

interface StatsRowProps {
	initialStreak: StatsStreakResponse;
	initialDailyGoal: StatsDailyGoalResponse;
}

export function StatsRow({ initialStreak, initialDailyGoal }: StatsRowProps) {
	const streakQuery = useStatsStreakQuery(initialStreak);
	const dailyGoalQuery = useStatsDailyGoalQuery(initialDailyGoal);
	const streak = streakQuery.data ?? initialStreak;
	const dailyGoal = dailyGoalQuery.data ?? initialDailyGoal;

	return (
		<div className="gap-3 grid sm:grid-cols-2">
			<StreakCard streak={streak} />
			<DailyGoalCard dailyGoal={dailyGoal} />
		</div>
	);
}

function StreakCard({ streak }: { streak: StatsStreakResponse }) {
	const t = useTranslations("lectio.stats.streak");
	const isActive = streak.current > 0;

	return (
		<Card className="p-4 gap-3 flex items-center">
			<span
				className={cn(
					"size-12 flex shrink-0 items-center justify-center rounded-xl",
					isActive ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground",
				)}
			>
				<FlameIcon className="size-6" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">{t("title")}</p>
				<p className="text-2xl font-semibold leading-tight">
					{t("currentDays", { count: streak.current })}
				</p>
				<p className="text-xs text-muted-foreground">
					{t("longest", { count: streak.longest })}
				</p>
			</div>
		</Card>
	);
}

function DailyGoalCard({ dailyGoal }: { dailyGoal: StatsDailyGoalResponse }) {
	const t = useTranslations("lectio.stats.dailyGoal");
	const tToast = useTranslations("lectio.toast");
	const setGoal = useSetDailyGoalMutation();
	const [popoverOpen, setPopoverOpen] = useState(false);
	const [draft, setDraft] = useState<string>(
		dailyGoal.goal != null ? `${dailyGoal.goal}` : "1",
	);

	const today = dailyGoal.today;
	const goal = dailyGoal.goal ?? 0;
	const ratio = goal > 0 ? Math.min(today / goal, 1) : 0;
	const radius = 22;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - circumference * ratio;
	const reached = goal > 0 && today >= goal;

	const handleSave = async () => {
		const next = Number.parseInt(draft, 10);
		try {
			await setGoal.mutateAsync({
				dailyGoalChapters: Number.isFinite(next) && next > 0 ? next : null,
			});
			toastSuccess(tToast("saved"));
			setPopoverOpen(false);
		} catch {
			toastError(tToast("saveError"));
		}
	};

	const handleClear = async () => {
		try {
			await setGoal.mutateAsync({ dailyGoalChapters: null });
			toastSuccess(tToast("saved"));
			setPopoverOpen(false);
		} catch {
			toastError(tToast("saveError"));
		}
	};

	return (
		<Card className="p-4 gap-3 flex items-center">
			<svg viewBox="0 0 56 56" className="size-14 shrink-0">
				<title>{t("ringTitle")}</title>
				<circle
					cx="28"
					cy="28"
					r={radius}
					strokeWidth="6"
					className="stroke-muted fill-none"
				/>
				<circle
					cx="28"
					cy="28"
					r={radius}
					strokeWidth="6"
					strokeLinecap="round"
					className={cn(
						"fill-none transition-all",
						reached ? "stroke-emerald-500" : "stroke-primary",
					)}
					style={{
						strokeDasharray: circumference,
						strokeDashoffset: offset,
						transform: "rotate(-90deg)",
						transformOrigin: "center",
					}}
				/>
				<text
					x="28"
					y="32"
					textAnchor="middle"
					className="fill-foreground font-semibold text-xs"
				>
					{goal > 0 ? `${today}/${goal}` : today}
				</text>
			</svg>
			<div className="min-w-0 flex-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">{t("title")}</p>
				<p className="text-sm font-medium">
					{goal > 0
						? reached
							? t("reached")
							: t("progress", { today, goal })
						: t("notSet")}
				</p>
				<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline" size="sm" className="mt-1">
							<TargetIcon className="mr-1.5 size-3.5" />
							{goal > 0 ? t("update") : t("setGoal")}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-64 space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="daily-goal-input" className="text-xs">
								{t("inputLabel")}
							</Label>
							<Input
								id="daily-goal-input"
								type="number"
								min={1}
								max={150}
								value={draft}
								onChange={(event) => setDraft(event.target.value)}
							/>
						</div>
						<div className="gap-2 flex items-center justify-between">
							{goal > 0 ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={handleClear}
									loading={setGoal.isPending}
								>
									{t("clear")}
								</Button>
							) : (
								<span />
							)}
							<Button
								type="button"
								size="sm"
								onClick={handleSave}
								loading={setGoal.isPending}
							>
								{t("save")}
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</Card>
	);
}
