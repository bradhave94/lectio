"use client";

import {
	DndContext,
	type DragEndEvent,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, cn } from "@repo/ui";
import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SortableItem {
	id: string;
}

interface PlanBuilderDndListProps<T extends SortableItem> {
	items: T[];
	onReorder: (orderedIds: string[]) => void;
	onSelectItem: (itemId: string) => void;
	renderItem: (item: T, index: number) => ReactNode;
	disabled?: boolean;
}

function SortableRow({
	id,
	index,
	onSelect,
	disabled,
	children,
}: {
	id: string;
	index: number;
	onSelect: () => void;
	disabled?: boolean;
	children: ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id,
			disabled,
		});

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			className={cn(
				"rounded-xl border bg-card p-3 transition-shadow",
				isDragging && "opacity-70 shadow-lg",
			)}
		>
			<div className="flex items-start gap-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="mt-0.5 size-8 shrink-0 cursor-grab active:cursor-grabbing"
					aria-label="Reorder"
					disabled={disabled}
					{...attributes}
					{...listeners}
				>
					<GripVerticalIcon className="size-4 text-muted-foreground" />
				</Button>
				<div className="min-w-0 flex-1">
					<button
						type="button"
						onClick={onSelect}
						className="w-full text-left"
						disabled={disabled}
					>
						<div className="mb-2 text-xs font-semibold text-muted-foreground">
							#{index + 1}
						</div>
						{children}
					</button>
				</div>
			</div>
		</div>
	);
}

export function PlanBuilderDndList<T extends SortableItem>({
	items,
	onReorder,
	onSelectItem,
	renderItem,
	disabled,
}: PlanBuilderDndListProps<T>) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 6,
			},
		}),
	);

	const orderedIds = items.map((item) => item.id);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}

		const oldIndex = orderedIds.indexOf(String(active.id));
		const newIndex = orderedIds.indexOf(String(over.id));
		if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
			return;
		}

		const nextIds = arrayMove(orderedIds, oldIndex, newIndex);
		onReorder(nextIds);
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
				<div className="flex flex-col gap-2">
					{items.map((item, index) => (
						<SortableRow
							key={item.id}
							id={item.id}
							index={index}
							onSelect={() => onSelectItem(item.id)}
							disabled={disabled}
						>
							{renderItem(item, index)}
						</SortableRow>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
