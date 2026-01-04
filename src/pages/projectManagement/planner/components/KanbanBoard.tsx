import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import type { PMColumn, PMTask, UpdateColumnInput } from '@/types/planner';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  columns: PMColumn[];
  tasks: PMTask[];
  onTaskClick: (task: PMTask) => void;
  onTaskCreate: (columnId: string) => void;
  onTaskMove: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
  onColumnReorder: (columnIds: string[]) => Promise<void>;
  onColumnUpdate: (columnId: string, input: UpdateColumnInput) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
}

export default function KanbanBoard({
  columns,
  tasks,
  onTaskClick,
  onTaskCreate,
  onTaskMove,
  onColumnReorder,
  onColumnUpdate,
  onColumnDelete,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'column' | 'task' | null>(null);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, PMTask[]>();
    columns.forEach((col) => map.set(col.id, []));
    tasks.forEach((task) => {
      const columnTasks = map.get(task.columnId) || [];
      columnTasks.push(task);
      map.set(task.columnId, columnTasks);
    });
    // Sort tasks by order within each column
    for (const [columnId, columnTasks] of map) {
      columnTasks.sort((a, b) => a.order - b.order);
      map.set(columnId, columnTasks);
    }
    return map;
  }, [columns, tasks]);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Find the active item
  const activeTask = activeType === 'task' ? tasks.find((t) => t.id === activeId) : null;
  const activeColumn = activeType === 'column' ? columns.find((c) => c.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    // Determine if dragging a column or task
    if (columns.some((c) => c.id === id)) {
      setActiveType('column');
    } else {
      setActiveType('task');
    }
    setActiveId(id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only handle task movement across columns
    if (activeType !== 'task') return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Find target column
    let targetColumnId: string | null = null;
    if (columns.some((c) => c.id === overId)) {
      targetColumnId = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetColumnId = overTask.columnId;
      }
    }

    // Move task to new column if different
    if (targetColumnId && targetColumnId !== activeTask.columnId) {
      const targetTasks = tasksByColumn.get(targetColumnId) || [];
      onTaskMove(activeId, targetColumnId, targetTasks.length);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeType === 'column') {
      // Reorder columns
      const oldIndex = columns.findIndex((c) => c.id === activeId);
      const newIndex = columns.findIndex((c) => c.id === overId);

      if (oldIndex !== newIndex) {
        const newColumns = [...columns];
        const [removed] = newColumns.splice(oldIndex, 1);
        newColumns.splice(newIndex, 0, removed);
        await onColumnReorder(newColumns.map((c) => c.id));
      }
    } else if (activeType === 'task') {
      // Find the task's new position
      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      let targetColumnId = activeTask.columnId;
      let newOrder = activeTask.order;

      // Determine target column
      if (columns.some((c) => c.id === overId)) {
        targetColumnId = overId;
        const columnTasks = tasksByColumn.get(targetColumnId) || [];
        newOrder = columnTasks.length;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          targetColumnId = overTask.columnId;
          const columnTasks = tasksByColumn.get(targetColumnId) || [];
          newOrder = columnTasks.findIndex((t) => t.id === overId);
          if (activeTask.columnId === targetColumnId && activeTask.order < newOrder) {
            // Moving down in same column
          }
        }
      }

      if (targetColumnId !== activeTask.columnId || newOrder !== activeTask.order) {
        await onTaskMove(activeId, targetColumnId, Math.max(0, newOrder));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn.get(column.id) || []}
                onTaskClick={onTaskClick}
                onTaskCreate={onTaskCreate}
                onColumnUpdate={onColumnUpdate}
                onColumnDelete={onColumnDelete}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-80">
            <KanbanCard task={activeTask} onClick={() => {}} isDragging />
          </div>
        )}
        {activeColumn && (
          <div className="opacity-80 w-72 bg-muted rounded-lg p-3">
            <div className="font-medium">{activeColumn.name}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
