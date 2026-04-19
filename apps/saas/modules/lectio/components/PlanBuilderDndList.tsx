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
import { cn } from "@repo/ui";
import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SortableItem {
	id: string;
}

interface PlanBuilderDndListProps<T extends SortableItem> {
	items: T[];
	onReorder: (orderedIds: string[]) => void;
	renderItem: (item: T, index: number) => ReactNode;
	disabled?: boolean;
}

function SortableRow({
	id,
	disabled,
	children,
}: {
	id: string;
	disabled?: boolean;
	children: ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
				"p-3 rounded-lg border bg-card transition-shadow",
				isDragging && "shadow-lg opacity-70",
			)}
		>
			<div className="gap-2 flex items-start">
				<button
					type="button"
					className="mt-0.5 h-8 w-8 flex cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent active:cursor-grabbing"
					aria-label="Reorder"
					disabled={disabled}
					{...attributes}
					{...listeners}
				>
					<GripVerticalIcon className="size-4" />
				</button>
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}

export function PlanBuilderDndList<T extends SortableItem>({
	items,
	onReorder,
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
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
				<div className="gap-2 flex flex-col">
					{items.map((item, index) => (
						<SortableRow key={item.id} id={item.id} disabled={disabled}>
							{renderItem(item, index)}
						</SortableRow>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
