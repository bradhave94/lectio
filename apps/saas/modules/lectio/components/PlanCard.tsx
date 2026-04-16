"use client";

import type { PlansListResponse } from "@lectio/hooks/use-lectio";
import { colorTokens, iconForKey } from "@lectio/lib/constants";
import {
	Button,
	Card,
	cn,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Progress,
} from "@repo/ui";
import { ArchiveIcon, BookOpenIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

interface PlanCardProps {
	plan: PlansListResponse[number];
	archived?: boolean;
	onLog?: () => void;
	onDelete?: () => void;
	onUnarchive?: () => void;
	onArchive?: () => void;
}

function percent(completed: number, total: number) {
	if (total <= 0) return 0;
	return Math.round((completed / total) * 100);
}

export function PlanCard({
	plan,
	archived = false,
	onLog,
	onDelete,
	onUnarchive,
	onArchive,
}: PlanCardProps) {
	const t = useTranslations("lectio");
	const format = useFormatter();
	const tokens = colorTokens(plan.color);
	const Icon = iconForKey(plan.icon);
	const completion = percent(plan.completedBooks, plan.totalBooks);

	return (
		<Card className={cn("p-4 space-y-3 border-l-4", tokens.border, archived && "opacity-70")}>
			<div className="gap-2 flex items-start justify-between">
				<Link href={`/plans/${plan.id}`} className="group min-w-0 gap-2 flex items-center">
					<span
						className={cn(
							"size-9 flex shrink-0 items-center justify-center rounded-md",
							tokens.soft,
						)}
					>
						<Icon className={cn("size-5", tokens.text)} />
					</span>
					<div className="min-w-0">
						<p className="font-semibold leading-tight truncate group-hover:underline">
							{plan.title}
						</p>
						<p className="text-xs truncate text-muted-foreground">
							{plan.description?.trim() || t("home.card.noDescription")}
						</p>
					</div>
				</Link>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="ghost" size="icon" aria-label={t("home.card.menu")}>
							<MoreHorizontalIcon className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{archived && onUnarchive ? (
							<DropdownMenuItem onClick={onUnarchive}>
								<ArchiveIcon className="mr-2 size-4" />
								{t("home.card.unarchive")}
							</DropdownMenuItem>
						) : null}
						{!archived && onArchive ? (
							<DropdownMenuItem onClick={onArchive}>
								<ArchiveIcon className="mr-2 size-4" />
								{t("home.card.archive")}
							</DropdownMenuItem>
						) : null}
						{onDelete ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={onDelete} className="text-destructive">
									<Trash2Icon className="mr-2 size-4" />
									{t("home.card.delete")}
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="space-y-1.5">
				<Progress value={completion} className="h-1.5" />
				<div className="text-xs flex items-center justify-between text-muted-foreground">
					<span>
						{t("home.card.bookProgress", {
							completed: plan.completedBooks,
							total: plan.totalBooks,
						})}
					</span>
					<span>
						{t("home.card.chaptersLogged", {
							count: plan.chaptersLogged,
						})}
					</span>
				</div>
			</div>

			<div className="gap-2 flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{t("home.card.updatedAt", {
						date: format.dateTime(new Date(plan.updatedAt), { dateStyle: "medium" }),
					})}
				</p>
				{onLog ? (
					<Button type="button" size="sm" onClick={onLog}>
						<BookOpenIcon className="mr-1.5 size-4" />
						{t("home.card.log")}
					</Button>
				) : null}
			</div>
		</Card>
	);
}
