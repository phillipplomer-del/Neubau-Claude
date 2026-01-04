import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, User, Flag, CheckSquare } from 'lucide-react';
import type { PMColumn, PMTask, UpdateTaskInput } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/planner';

interface TaskListViewProps {
  columns: PMColumn[];
  tasks: PMTask[];
  onTaskClick: (task: PMTask) => void;
  onTaskUpdate: (taskId: string, input: UpdateTaskInput) => Promise<void>;
}

export default function TaskListView({
  columns,
  tasks,
  onTaskClick,
  onTaskUpdate,
}: TaskListViewProps) {
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(
    new Set(columns.map((c) => c.id))
  );

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, PMTask[]>();
    columns.forEach((col) => map.set(col.id, []));
    tasks.forEach((task) => {
      const columnTasks = map.get(task.columnId) || [];
      columnTasks.push(task);
      map.set(task.columnId, columnTasks);
    });
    for (const [columnId, columnTasks] of map) {
      columnTasks.sort((a, b) => a.order - b.order);
      map.set(columnId, columnTasks);
    }
    return map;
  }, [columns, tasks]);

  const toggleColumn = (columnId: string) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId);
    } else {
      newExpanded.add(columnId);
    }
    setExpandedColumns(newExpanded);
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getChecklistProgress = (task: PMTask) => {
    if (task.checklist.length === 0) return null;
    const completed = task.checklist.filter((i) => i.completed).length;
    return `${completed}/${task.checklist.length}`;
  };

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12"></th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Titel</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-28">Priorität</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-32">Bearbeiter</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-28">Startdatum</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-28">Fällig</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-24">Fortschritt</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => {
            const columnTasks = tasksByColumn.get(column.id) || [];
            const isExpanded = expandedColumns.has(column.id);

            return (
              <>
                {/* Column Header Row */}
                <tr
                  key={column.id}
                  className="bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleColumn(column.id)}
                >
                  <td className="py-2 px-4">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td colSpan={6} className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      {column.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                      )}
                      <span className="font-medium">{column.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({columnTasks.length})
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Task Rows */}
                {isExpanded &&
                  columnTasks.map((task) => {
                    const isOverdue =
                      task.dueDate && !task.completedAt && new Date() > task.dueDate.toDate();
                    const checklistProgress = getChecklistProgress(task);

                    return (
                      <tr
                        key={task.id}
                        className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => onTaskClick(task)}
                      >
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {task.code && (
                              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                [{task.code}]
                              </span>
                            )}
                            <span className="font-medium">{task.title}</span>
                            {task.labels.length > 0 && (
                              <div className="flex gap-1">
                                {task.labels.slice(0, 2).map((label) => (
                                  <span
                                    key={label.id}
                                    className="px-1.5 py-0.5 text-[10px] rounded"
                                    style={{
                                      backgroundColor: `${label.color}20`,
                                      color: label.color,
                                    }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Flag
                              className="h-3.5 w-3.5"
                              style={{ color: PRIORITY_COLORS[task.priority] }}
                            />
                            <span style={{ color: PRIORITY_COLORS[task.priority] }}>
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[100px]">{task.assignee}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(task.startDate)}
                        </td>
                        <td className={`py-3 px-4 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {formatDate(task.dueDate)}
                        </td>
                        <td className="py-3 px-4">
                          {checklistProgress ? (
                            <div className="flex items-center gap-1.5">
                              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{checklistProgress}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </>
            );
          })}
        </tbody>
      </table>

      {tasks.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Keine Aufgaben vorhanden
        </div>
      )}
    </div>
  );
}
