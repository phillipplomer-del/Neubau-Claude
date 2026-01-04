import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, MessageSquare, CheckSquare, Flag, Milestone } from 'lucide-react';
import type { PMTask } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/planner';

interface KanbanCardProps {
  task: PMTask;
  onClick: () => void;
  isDragging?: boolean;
}

export default function KanbanCard({ task, onClick, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return null;
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const isOverdue = task.dueDate && !task.completedAt && new Date() > task.dueDate.toDate();
  const isMilestone = task.taskType === 'milestone';
  const completedChecklist = task.checklist.filter((item) => item.completed).length;
  const totalChecklist = task.checklist.length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group bg-card border border-border rounded-lg p-3 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:border-primary/30
        ${isDragging || isSortableDragging ? 'shadow-lg ring-2 ring-primary/20' : ''}
        ${isMilestone ? 'border-l-4' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Title with Task Code */}
      <div className="flex items-start gap-2 mb-2">
        {isMilestone && (
          <Milestone className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          {task.code && (
            <span className="text-xs text-muted-foreground mr-1">[{task.code}]</span>
          )}
          <span className="text-sm font-medium text-foreground line-clamp-2">
            {task.title}
          </span>
        </div>
      </div>

      {/* Progress Bar (for checklist) */}
      {totalChecklist > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {completedChecklist}/{totalChecklist}
            </span>
          </div>
        </div>
      )}

      {/* Meta Info */}
      <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
        {/* Priority */}
        <div className="flex items-center gap-1">
          <Flag
            className="h-3 w-3"
            style={{ color: PRIORITY_COLORS[task.priority] }}
          />
          <span style={{ color: PRIORITY_COLORS[task.priority] }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
            <Calendar className="h-3 w-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px]">{task.assignee}</span>
          </div>
        )}

        {/* Comments indicator */}
        {task.hasComments && (
          <MessageSquare className="h-3 w-3" />
        )}

        {/* Checklist indicator */}
        {totalChecklist > 0 && (
          <div className="flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
