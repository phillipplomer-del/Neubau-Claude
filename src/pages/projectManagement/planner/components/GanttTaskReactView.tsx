/**
 * Gantt Task React View - Professionelle Gantt-Ansicht mit Dependency-Arrows
 * Verwendet die gantt-task-react Library für saubere Visualisierung
 */

import { useMemo, useState, useCallback } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { PMTask, PMColumn, PMBoard, PMPriority, UpdateTaskInput } from '@/types/planner';
import Button from '@/components/ui/Button';
import { Calendar } from 'lucide-react';
import TaskModal from './TaskModal';

interface GanttTaskReactViewProps {
  board: PMBoard;
  columns: PMColumn[];
  tasks: PMTask[];
  onUpdateTask: (taskId: string, updates: UpdateTaskInput) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onMoveTask: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
}

type ZoomLevel = 'day' | 'week' | 'month';

const PRIORITY_COLORS: Record<PMPriority, string> = {
  low: '#94A3B8',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

// Custom Tooltip Component
const CustomTooltip: React.FC<{ task: Task; fontSize: string; fontFamily: string }> = ({
  task,
  fontSize,
  fontFamily,
}) => {
  return (
    <div
      className="bg-popover border border-border rounded-lg shadow-lg p-3 max-w-xs"
      style={{ fontSize, fontFamily }}
    >
      <div className="font-semibold text-foreground mb-1">{task.name}</div>
      <div className="text-sm text-muted-foreground space-y-1">
        <div>
          Start: {format(task.start, 'dd.MM.yyyy', { locale: de })}
        </div>
        <div>
          Ende: {format(task.end, 'dd.MM.yyyy', { locale: de })}
        </div>
        {task.progress > 0 && (
          <div>Fortschritt: {Math.round(task.progress)}%</div>
        )}
      </div>
    </div>
  );
};

export default function GanttTaskReactView({
  board,
  columns,
  tasks,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
}: GanttTaskReactViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [selectedTask, setSelectedTask] = useState<PMTask | null>(null);

  // Map zoom to ViewMode
  const viewMode = useMemo(() => {
    switch (zoom) {
      case 'day': return ViewMode.Day;
      case 'week': return ViewMode.Week;
      case 'month': return ViewMode.Month;
    }
  }, [zoom]);

  // Column width based on zoom
  const columnWidth = useMemo(() => {
    switch (zoom) {
      case 'day': return 50;
      case 'week': return 150;
      case 'month': return 200;
    }
  }, [zoom]);

  // Create a map of task codes to task IDs for dependency resolution
  const taskCodeToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      if (task.code) {
        map.set(task.code, task.id);
      }
    });
    return map;
  }, [tasks]);

  // Convert PMTask to gantt-task-react Task format
  // Sort by start date so "Projektstart" appears at top
  const ganttTasks: Task[] = useMemo(() => {
    // Filter tasks with dates and sort by start date
    const tasksWithDates = tasks
      .filter(t => t.startDate || t.dueDate)
      .sort((a, b) => {
        const startA = a.startDate?.toDate() || a.dueDate?.toDate();
        const startB = b.startDate?.toDate() || b.dueDate?.toDate();
        if (!startA || !startB) return 0;
        return startA.getTime() - startB.getTime();
      });

    return tasksWithDates.map((task, index) => {
      const startDate = task.startDate?.toDate();
      const dueDate = task.dueDate?.toDate();

      const start = startDate || dueDate!;
      const end = dueDate || startDate!;

      // Resolve dependencies - predecessorId can be either a task ID or a code
      const dependencies: string[] = [];
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(dep => {
          // Try to resolve: first check if it's a code, otherwise use as ID
          const predId = dep.predecessorId;
          const resolvedId = taskCodeToIdMap.get(predId) || predId;
          // Verify the task exists
          if (tasks.some(t => t.id === resolvedId)) {
            dependencies.push(resolvedId);
          }
        });
      }

      return {
        id: task.id,
        name: task.code ? `[${task.code}] ${task.title}` : task.title,
        type: task.taskType === 'milestone' ? 'milestone' : 'task' as const,
        start,
        end,
        progress: task.completionPercentage || 0,
        dependencies,
        displayOrder: index,
        styles: {
          backgroundColor: PRIORITY_COLORS[task.priority],
          backgroundSelectedColor: PRIORITY_COLORS[task.priority],
          progressColor: `${PRIORITY_COLORS[task.priority]}CC`,
          progressSelectedColor: `${PRIORITY_COLORS[task.priority]}CC`,
        },
      };
    });
  }, [tasks, taskCodeToIdMap]);

  // Find original PMTask by ID
  const findPMTask = useCallback((taskId: string): PMTask | undefined => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  // Handle task double-click (not single click, to allow dragging)
  const handleTaskDoubleClick = useCallback((task: Task) => {
    // Don't open modal for project (column) items
    if (task.type === 'project') return;

    const pmTask = findPMTask(task.id);
    if (pmTask) {
      setSelectedTask(pmTask);
    }
  }, [findPMTask]);

  // Find all tasks that depend on a given task (successors)
  const findSuccessors = useCallback((taskId: string): PMTask[] => {
    return tasks.filter(t =>
      t.dependencies?.some(dep => dep.predecessorId === taskId)
    );
  }, [tasks]);

  // Recursively collect all affected tasks (successors of successors)
  const collectAllAffectedTasks = useCallback((taskId: string, visited: Set<string> = new Set()): PMTask[] => {
    if (visited.has(taskId)) return [];
    visited.add(taskId);

    const directSuccessors = findSuccessors(taskId);
    const allAffected: PMTask[] = [...directSuccessors];

    for (const successor of directSuccessors) {
      const nested = collectAllAffectedTasks(successor.id, visited);
      allAffected.push(...nested);
    }

    return allAffected;
  }, [findSuccessors]);

  // Handle date change (drag) with cascading updates
  const handleDateChange = useCallback(async (task: Task): Promise<boolean> => {
    // Don't allow changing project (column) dates directly
    if (task.type === 'project') return false;

    const pmTask = findPMTask(task.id);
    if (!pmTask) return false;

    try {
      // Calculate how much the task moved
      const originalEnd = pmTask.dueDate?.toDate();
      const newEnd = task.end;

      // Update the changed task first
      await onUpdateTask(task.id, {
        startDate: task.start,
        dueDate: task.end,
      });

      // If end date changed, cascade to dependent tasks
      if (originalEnd && newEnd) {
        const daysDiff = Math.ceil((newEnd.getTime() - originalEnd.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff !== 0) {
          // Find all tasks that need to be shifted
          const affectedTasks = collectAllAffectedTasks(task.id);

          // Update each affected task
          for (const affected of affectedTasks) {
            const affectedStart = affected.startDate?.toDate();
            const affectedEnd = affected.dueDate?.toDate();

            if (affectedStart && affectedEnd) {
              const dep = affected.dependencies?.find(d => d.predecessorId === task.id);
              const lagDays = dep?.lagDays || 0;

              // For FS: successor should start after predecessor ends + lag
              const requiredStart = new Date(newEnd);
              requiredStart.setDate(requiredStart.getDate() + lagDays + 1);

              // Calculate shift (positive = forward, negative = backward)
              const shiftDays = Math.ceil((requiredStart.getTime() - affectedStart.getTime()) / (1000 * 60 * 60 * 24));

              // Only shift if there's actually a difference
              if (shiftDays !== 0) {
                const newAffectedStart = new Date(affectedStart);
                newAffectedStart.setDate(newAffectedStart.getDate() + shiftDays);

                const newAffectedEnd = new Date(affectedEnd);
                newAffectedEnd.setDate(newAffectedEnd.getDate() + shiftDays);

                await onUpdateTask(affected.id, {
                  startDate: newAffectedStart,
                  dueDate: newAffectedEnd,
                });
              }
            }
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to update task dates:', error);
      return false;
    }
  }, [findPMTask, onUpdateTask, collectAllAffectedTasks]);

  // Handle progress change
  const handleProgressChange = useCallback(async (task: Task): Promise<boolean> => {
    if (task.type === 'project') return false;

    const pmTask = findPMTask(task.id);
    if (!pmTask) return false;

    // Update checklist completion based on progress
    // For now, we just log it - actual checklist update would be more complex
    console.log(`Progress changed to ${task.progress}% for task ${task.name}`);
    return true;
  }, [findPMTask]);

  // Handle expander click
  const handleExpanderClick = useCallback((task: Task) => {
    // Toggle project expansion
    // This is handled internally by the library
  }, []);

  // Handle scroll to today
  const scrollToToday = () => {
    // The library handles this via viewDate prop
    // We could add a viewDate state if needed
  };

  // Don't render if no tasks with dates
  if (ganttTasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Noch keine Tasks mit Datumsangaben vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Controls Bar */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-background flex items-center justify-between">
        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Zoom:</span>
          <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
            <button
              onClick={() => setZoom('day')}
              className={`px-2 py-1 text-xs rounded transition-all ${
                zoom === 'day'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tag
            </button>
            <button
              onClick={() => setZoom('week')}
              className={`px-2 py-1 text-xs rounded transition-all ${
                zoom === 'week'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setZoom('month')}
              className={`px-2 py-1 text-xs rounded transition-all ${
                zoom === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monat
            </button>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={scrollToToday} className="h-7 text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          Heute
        </Button>
      </div>

      {/* Gantt Chart - Full Height with Scrollbars */}
      <div className="flex-1 overflow-auto gantt-wrapper">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          locale="de"
          columnWidth={columnWidth}
          listCellWidth="140px"
          rowHeight={36}
          headerHeight={44}
          ganttHeight={0}
          barCornerRadius={3}
          barFill={70}
          handleWidth={6}
          todayColor="rgba(239, 68, 68, 0.2)"
          arrowColor="#6366F1"
          arrowIndent={15}
          onDoubleClick={handleTaskDoubleClick}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onExpanderClick={handleExpanderClick}
          TooltipContent={CustomTooltip}
        />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          columns={columns}
          allTasks={tasks}
          open={true}
          onClose={() => setSelectedTask(null)}
          onUpdate={(input) => onUpdateTask(selectedTask.id, input)}
          onDelete={() => {
            onDeleteTask(selectedTask.id);
            setSelectedTask(null);
          }}
          onMove={(columnId) => {
            const targetTasks = tasks.filter((t) => t.columnId === columnId);
            onMoveTask(selectedTask.id, columnId, targetTasks.length);
          }}
        />
      )}

      {/* Custom styles for fullscreen & theme compatibility */}
      <style>{`
        /* Make gantt fill available space with horizontal scroll */
        .gantt-wrapper {
          height: 100%;
          overflow: auto !important;
        }
        .gantt-wrapper > div {
          min-height: 100%;
          min-width: fit-content;
        }
        /* Ensure the chart area can scroll horizontally */
        .gantt-wrapper ._CZjuD {
          overflow-x: auto !important;
          overflow-y: auto !important;
        }
        /* Make sure the SVG doesn't clip */
        .gantt-wrapper svg {
          overflow: visible;
        }
        /* Reset library's dark backgrounds */
        .gantt-wrapper svg {
          background: white !important;
        }
        /* Calendar grid lines */
        .gantt-wrapper line {
          stroke: #e5e7eb !important;
        }
        /* Text colors */
        .gantt-wrapper text {
          fill: #374151 !important;
          font-size: 11px !important;
        }
        /* Task list styling */
        .gantt-wrapper > div > div {
          background: white !important;
        }
        /* Visible scrollbars - increase size for better usability */
        .gantt-wrapper {
          scrollbar-width: auto;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
        .gantt-wrapper ::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .gantt-wrapper ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        .gantt-wrapper ::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        .gantt-wrapper ::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        .gantt-wrapper ::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
        /* Ensure nested scrollbars also work */
        .gantt-wrapper * {
          scrollbar-width: auto;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
        .gantt-wrapper *::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .gantt-wrapper *::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .gantt-wrapper *::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 6px;
        }
        /* Dark mode */
        .dark .gantt-wrapper svg {
          background: hsl(var(--background)) !important;
        }
        .dark .gantt-wrapper > div,
        .dark .gantt-wrapper > div > div {
          background: hsl(var(--background)) !important;
        }
        .dark .gantt-wrapper text {
          fill: hsl(var(--foreground)) !important;
        }
        .dark .gantt-wrapper line {
          stroke: hsl(var(--border)) !important;
        }
        .dark .gantt-wrapper,
        .dark .gantt-wrapper * {
          scrollbar-color: #475569 #1e293b;
        }
        .dark .gantt-wrapper ::-webkit-scrollbar-track,
        .dark .gantt-wrapper *::-webkit-scrollbar-track {
          background: #1e293b;
        }
        .dark .gantt-wrapper ::-webkit-scrollbar-thumb,
        .dark .gantt-wrapper *::-webkit-scrollbar-thumb {
          background: #475569;
          border-color: #1e293b;
        }
      `}</style>
    </div>
  );
}
