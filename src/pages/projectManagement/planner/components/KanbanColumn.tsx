import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react';
import type { PMColumn, PMTask, UpdateColumnInput } from '@/types/planner';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: PMColumn;
  tasks: PMTask[];
  onTaskClick: (task: PMTask) => void;
  onTaskCreate: (columnId: string) => void;
  onColumnUpdate: (columnId: string, input: UpdateColumnInput) => Promise<void>;
  onColumnDelete: (columnId: string) => Promise<void>;
}

export default function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onTaskCreate,
  onColumnUpdate,
  onColumnDelete,
}: KanbanColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveName = async () => {
    if (editName.trim() && editName !== column.name) {
      await onColumnUpdate(column.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Spalte "${column.name}" und alle enthaltenen Tasks löschen?`)) {
      await onColumnDelete(column.id);
    }
    setShowMenu(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 flex-shrink-0 bg-muted/50 rounded-lg flex flex-col max-h-full"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Color Indicator */}
          {column.color && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: column.color }}
            />
          )}

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setEditName(column.name);
                  setIsEditing(false);
                }
              }}
              className="flex-1 px-2 py-0.5 text-sm font-medium bg-input border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          ) : (
            <span className="font-medium text-sm truncate">{column.name}</span>
          )}

          {/* Task Count */}
          <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full text-muted-foreground flex-shrink-0">
            {tasks.length}
          </span>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Umbenennen
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Keine Aufgaben
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => onTaskCreate(column.id)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Aufgabe hinzufügen
        </button>
      </div>
    </div>
  );
}
