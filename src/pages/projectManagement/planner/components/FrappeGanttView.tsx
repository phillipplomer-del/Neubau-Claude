/**
 * Frappe Gantt View - Uses frappe-gantt library for proper dependency arrows
 */
import { useEffect, useRef, useMemo, useCallback } from 'react';
import Gantt from 'frappe-gantt';
import type { PMTask, PMColumn, UpdateTaskInput } from '@/types/planner';

// Fixed order based on tasks.csv
const TASK_ORDER: string[] = [
  'M1', 'V1', 'V2.1', 'M3', 'V2.3', 'M4',
  'V3.1', 'V3.2', 'V3.3', 'V3.4',
  'V4.1', 'M5', 'V4.3', 'V4.4', 'M6',
  'V5.1', 'M7', 'M8',
];

interface FrappeGanttViewProps {
  columns: PMColumn[];
  tasks: PMTask[];
  onTaskClick: (task: PMTask) => void;
  onTaskUpdate: (taskId: string, input: UpdateTaskInput) => Promise<void>;
}

export default function FrappeGanttView({
  columns,
  tasks,
  onTaskClick,
  onTaskUpdate,
}: FrappeGanttViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  // Get order for a task code
  const getTaskOrder = useCallback((code: string | undefined): number => {
    if (!code) return 999;
    const idx = TASK_ORDER.indexOf(code);
    return idx === -1 ? 999 : idx;
  }, []);

  // Sort tasks and create map
  const { sortedTasks, taskMap, codeToIdMap } = useMemo(() => {
    const sorted = [...tasks]
      .filter(t => t.startDate || t.dueDate)
      .sort((a, b) => getTaskOrder(a.code) - getTaskOrder(b.code));

    const tMap = new Map<string, PMTask>();
    const cMap = new Map<string, string>();
    sorted.forEach(t => {
      tMap.set(t.id, t);
      if (t.code) cMap.set(t.code, t.id);
    });

    return { sortedTasks: sorted, taskMap: tMap, codeToIdMap: cMap };
  }, [tasks, getTaskOrder]);

  // Convert to frappe-gantt format
  const ganttTasks = useMemo(() => {
    return sortedTasks.map(task => {
      const start = task.startDate?.toDate() || task.dueDate?.toDate() || new Date();
      const end = task.dueDate?.toDate() || task.startDate?.toDate() || new Date();

      // Resolve dependencies
      const dependencies: string[] = [];
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(dep => {
          // Try code first, then ID
          const resolvedId = codeToIdMap.get(dep.predecessorId) || dep.predecessorId;
          if (taskMap.has(resolvedId)) {
            dependencies.push(resolvedId);
          }
        });
      }

      return {
        id: task.id,
        name: task.code ? `[${task.code}] ${task.title}` : task.title,
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        progress: task.completionPercentage || 0,
        dependencies: dependencies.join(', '),
        custom_class: task.taskType === 'milestone' ? 'milestone' : '',
      };
    });
  }, [sortedTasks, taskMap, codeToIdMap]);

  // Initialize and update Gantt
  useEffect(() => {
    if (!containerRef.current || ganttTasks.length === 0) return;

    // Clear previous
    containerRef.current.innerHTML = '';

    try {
      ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
        view_mode: 'Week',
        date_format: 'YYYY-MM-DD',
        language: 'de',
        custom_popup_html: (task: { name: string; _start: Date; _end: Date; progress: number }) => {
          const start = task._start.toLocaleDateString('de-DE');
          const end = task._end.toLocaleDateString('de-DE');
          return `
            <div class="p-3 bg-popover border border-border rounded-lg shadow-lg">
              <h5 class="font-semibold text-sm mb-2">${task.name}</h5>
              <p class="text-xs text-muted-foreground">Start: ${start}</p>
              <p class="text-xs text-muted-foreground">Ende: ${end}</p>
              ${task.progress > 0 ? `<p class="text-xs text-muted-foreground">Fortschritt: ${task.progress}%</p>` : ''}
            </div>
          `;
        },
        on_click: (task: { id: string }) => {
          const pmTask = taskMap.get(task.id);
          if (pmTask) onTaskClick(pmTask);
        },
        on_date_change: async (task: { id: string; _start: Date; _end: Date }, start: Date, end: Date) => {
          const pmTask = taskMap.get(task.id);
          if (!pmTask) return;

          // Calculate how much the task moved
          const originalEnd = pmTask.dueDate?.toDate();
          const daysDiff = originalEnd
            ? Math.ceil((end.getTime() - originalEnd.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          // Update this task
          await onTaskUpdate(task.id, {
            startDate: start,
            dueDate: end,
          });

          // Cascade to dependent tasks if end date changed
          if (daysDiff !== 0) {
            const affectedTasks = findAffectedTasks(task.id);
            for (const affected of affectedTasks) {
              const affectedStart = affected.startDate?.toDate();
              const affectedEnd = affected.dueDate?.toDate();
              if (affectedStart && affectedEnd) {
                const newStart = new Date(affectedStart);
                newStart.setDate(newStart.getDate() + daysDiff);
                const newEnd = new Date(affectedEnd);
                newEnd.setDate(newEnd.getDate() + daysDiff);
                await onTaskUpdate(affected.id, {
                  startDate: newStart,
                  dueDate: newEnd,
                });
              }
            }
          }
        },
        on_progress_change: (task: { id: string }, progress: number) => {
          // Progress changes not saved for now
          console.log('Progress changed:', task.id, progress);
        },
      });
    } catch (error) {
      console.error('Failed to initialize Gantt:', error);
    }
  }, [ganttTasks, taskMap, onTaskClick, onTaskUpdate]);

  // Find all tasks that depend on a given task (recursively)
  const findAffectedTasks = useCallback((taskId: string): PMTask[] => {
    const affected: PMTask[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      // Find tasks that have this task as a dependency
      sortedTasks.forEach(t => {
        if (t.dependencies?.some(d => {
          const resolvedId = codeToIdMap.get(d.predecessorId) || d.predecessorId;
          return resolvedId === id;
        })) {
          affected.push(t);
          visit(t.id);
        }
      });
    };

    visit(taskId);
    return affected;
  }, [sortedTasks, codeToIdMap]);

  if (sortedTasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Keine Tasks mit Datumsangaben vorhanden
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-auto" />
      <style>{`
        .gantt .bar-wrapper {
          cursor: move;
        }
        .gantt .bar {
          fill: #3B82F6;
          stroke: none;
          rx: 3;
        }
        .gantt .bar-progress {
          fill: #1D4ED8;
        }
        .gantt .bar-label {
          fill: white;
          font-size: 11px;
        }
        .gantt .milestone .bar {
          fill: #F59E0B;
        }
        .gantt .arrow {
          stroke: #6366F1;
          stroke-width: 1.5;
          fill: none;
        }
        .gantt .grid-header {
          fill: hsl(var(--muted));
        }
        .gantt .grid-row {
          fill: transparent;
        }
        .gantt .grid-row:nth-child(even) {
          fill: hsl(var(--muted) / 0.3);
        }
        .gantt .row-line {
          stroke: hsl(var(--border));
        }
        .gantt .tick {
          stroke: hsl(var(--border));
        }
        .gantt .today-highlight {
          fill: hsl(var(--primary) / 0.1);
        }
        .gantt-container {
          overflow: auto;
        }
        .gantt .lower-text, .gantt .upper-text {
          fill: hsl(var(--foreground));
          font-size: 11px;
        }
        .dark .gantt .bar {
          fill: #3B82F6;
        }
        .dark .gantt .bar-label {
          fill: white;
        }
      `}</style>
    </div>
  );
}
