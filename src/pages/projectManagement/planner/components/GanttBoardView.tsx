import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Milestone } from 'lucide-react';
import type { PMColumn, PMTask, UpdateTaskInput } from '@/types/planner';
import { PRIORITY_COLORS } from '@/types/planner';

// Fixed order based on tasks.csv - this is the standard project sequence
const TASK_ORDER: string[] = [
  'M1', 'V1', 'V2.1', 'M3', 'V2.3', 'M4',
  'V3.1', 'V3.2', 'V3.3', 'V3.4',
  'V4.1', 'M5', 'V4.3', 'V4.4', 'M6',
  'V5.1', 'M7', 'M8',
];

interface GanttBoardViewProps {
  columns: PMColumn[];
  tasks: PMTask[];
  onTaskClick: (task: PMTask) => void;
  onTaskUpdate: (taskId: string, input: UpdateTaskInput) => Promise<void>;
}

type ZoomLevel = 'day' | 'week' | 'month';

export default function GanttBoardView({
  columns,
  tasks,
  onTaskClick,
  onTaskUpdate,
}: GanttBoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [scrollLeft, setScrollLeft] = useState(0);

  // Configuration based on zoom level
  const zoomConfig = useMemo(
    () => ({
      day: { cellWidth: 40, format: 'dd', headerFormat: 'dd.MM' },
      week: { cellWidth: 100, format: 'KW ww', headerFormat: "'KW' ww" },
      month: { cellWidth: 150, format: 'MMM yyyy', headerFormat: 'MMMM yyyy' },
    }),
    []
  );

  const config = zoomConfig[zoomLevel];

  // Calculate date range from tasks
  const { startDate, endDate, dateRange } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);

    tasks.forEach((task) => {
      if (task.startDate) {
        const start = task.startDate.toDate();
        if (start < minDate) minDate = new Date(start);
      }
      if (task.dueDate) {
        const end = task.dueDate.toDate();
        if (end > maxDate) maxDate = new Date(end);
      }
    });

    // Pad dates by 1 week on each side
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    // Round to beginning of week for week view
    if (zoomLevel === 'week') {
      const dayOfWeek = minDate.getDay();
      minDate.setDate(minDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    }

    // Generate date range
    const range: Date[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      range.push(new Date(current));
      if (zoomLevel === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (zoomLevel === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return { startDate: minDate, endDate: maxDate, dateRange: range };
  }, [tasks, zoomLevel]);

  // Get order for a task code
  const getTaskOrder = useCallback((code: string | undefined): number => {
    if (!code) return 999;
    const idx = TASK_ORDER.indexOf(code);
    return idx === -1 ? 999 : idx;
  }, []);

  // Sort all tasks by fixed order (ignoring columns)
  const sortedTasks = useMemo(() => {
    return [...tasks]
      .filter(t => t.startDate || t.dueDate)
      .sort((a, b) => getTaskOrder(a.code) - getTaskOrder(b.code));
  }, [tasks, getTaskOrder]);

  // Calculate task position and width
  const getTaskStyle = (task: PMTask) => {
    const taskStart = task.startDate?.toDate() || new Date();
    const taskEnd = task.dueDate?.toDate() || taskStart;

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const startDays = Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)));

    const totalWidth = dateRange.length * config.cellWidth;
    const left = (startDays / totalDays) * totalWidth;
    const width = task.taskType === 'milestone' ? 24 : (duration / totalDays) * totalWidth;

    return { left: Math.max(0, left), width: Math.max(width, 20) };
  };

  const formatHeaderDate = (date: Date) => {
    if (zoomLevel === 'day') {
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    } else if (zoomLevel === 'week') {
      // Get ISO week number
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `KW ${weekNo}`;
    } else {
      return date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isTodayInRange = (date: Date) => {
    const today = new Date();
    if (zoomLevel === 'day') {
      return isToday(date);
    } else if (zoomLevel === 'week') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return today >= date && today <= weekEnd;
    } else {
      return today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear();
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = config.cellWidth * 3;
      containerRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  // Drag state
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  // Handle drag start
  const handleDragStart = (
    e: React.MouseEvent,
    task: PMTask,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    const taskStart = task.startDate?.toDate() || new Date();
    const taskEnd = task.dueDate?.toDate() || taskStart;
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      originalStart: new Date(taskStart),
      originalEnd: new Date(taskEnd),
    });
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const daysDelta = Math.round(deltaX / (config.cellWidth / 7));

    if (daysDelta === 0) return;

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) return;

    let newStart = new Date(dragState.originalStart);
    let newEnd = new Date(dragState.originalEnd);

    if (dragState.type === 'move') {
      newStart.setDate(newStart.getDate() + daysDelta);
      newEnd.setDate(newEnd.getDate() + daysDelta);
    } else if (dragState.type === 'resize-left') {
      newStart.setDate(newStart.getDate() + daysDelta);
      if (newStart >= newEnd) return;
    } else if (dragState.type === 'resize-right') {
      newEnd.setDate(newEnd.getDate() + daysDelta);
      if (newEnd <= newStart) return;
    }

    // Visual feedback only during drag - actual update on mouseup
  }, [dragState, tasks, config.cellWidth]);

  // Handle drag end
  const handleDragEnd = useCallback(async (e: MouseEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const daysDelta = Math.round(deltaX / (config.cellWidth / 7));

    if (daysDelta !== 0) {
      let newStart = new Date(dragState.originalStart);
      let newEnd = new Date(dragState.originalEnd);

      if (dragState.type === 'move') {
        newStart.setDate(newStart.getDate() + daysDelta);
        newEnd.setDate(newEnd.getDate() + daysDelta);
      } else if (dragState.type === 'resize-left') {
        newStart.setDate(newStart.getDate() + daysDelta);
      } else if (dragState.type === 'resize-right') {
        newEnd.setDate(newEnd.getDate() + daysDelta);
      }

      if (newStart < newEnd) {
        await onTaskUpdate(dragState.taskId, {
          startDate: newStart,
          dueDate: newEnd,
        });
      }
    }

    setDragState(null);
  }, [dragState, config.cellWidth, onTaskUpdate]);

  // Attach global mouse events for drag
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => handleDragMove(e);
    const handleMouseUp = (e: MouseEvent) => handleDragEnd(e);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom:</span>
          <div className="flex bg-muted rounded-lg p-1">
            {(['day', 'week', 'month'] as ZoomLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  zoomLevel === level
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {level === 'day' ? 'Tag' : level === 'week' ? 'Woche' : 'Monat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex-1 overflow-hidden border border-border rounded-lg">
        <div className="flex h-full">
          {/* Left Panel - Task Names */}
          <div className="w-64 flex-shrink-0 border-r border-border bg-muted/30">
            {/* Header */}
            <div className="h-12 border-b border-border px-4 flex items-center font-medium text-sm">
              Aufgabe
            </div>
            {/* Task List - sorted by fixed order */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 3rem)' }}>
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="h-10 px-4 flex items-center gap-2 border-b border-border hover:bg-muted/50 cursor-pointer"
                >
                  {task.code && (
                    <span className="text-xs text-muted-foreground font-mono">[{task.code}]</span>
                  )}
                  {task.taskType === 'milestone' && (
                    <Milestone className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{task.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Timeline */}
          <div className="flex-1 overflow-x-auto" ref={containerRef}>
            <div style={{ minWidth: dateRange.length * config.cellWidth }}>
              {/* Timeline Header */}
              <div className="h-12 border-b border-border flex sticky top-0 bg-card z-10">
                {dateRange.map((date, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 border-r border-border flex items-center justify-center text-xs font-medium ${
                      isTodayInRange(date) ? 'bg-primary/10 text-primary' : ''
                    }`}
                    style={{ width: config.cellWidth }}
                  >
                    {formatHeaderDate(date)}
                  </div>
                ))}
              </div>

              {/* Task Rows - sorted by fixed order */}
              <div className="relative">
                {sortedTasks.map((task) => {
                  const style = getTaskStyle(task);
                  const isMilestone = task.taskType === 'milestone';
                  const column = columns.find(c => c.id === task.columnId);
                  const isDragging = dragState?.taskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="h-10 border-b border-border relative"
                    >
                      {/* Background grid */}
                      <div className="absolute inset-0 flex">
                        {dateRange.map((date, index) => (
                          <div
                            key={index}
                            className={`flex-shrink-0 border-r border-border/50 ${
                              isTodayInRange(date) ? 'bg-primary/5' : ''
                            }`}
                            style={{ width: config.cellWidth }}
                          />
                        ))}
                      </div>

                      {/* Task Bar */}
                      {task.startDate && (
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 transition-all group ${
                            isMilestone
                              ? 'rotate-45 bg-amber-500 cursor-pointer'
                              : 'rounded h-6 cursor-move'
                          } ${isDragging ? 'opacity-70 ring-2 ring-primary' : 'hover:opacity-90'}`}
                          style={{
                            left: style.left,
                            width: isMilestone ? 16 : style.width,
                            height: isMilestone ? 16 : undefined,
                            backgroundColor: isMilestone
                              ? undefined
                              : column?.color || PRIORITY_COLORS[task.priority],
                          }}
                          title={`${task.title}${task.assignee ? ` - ${task.assignee}` : ''}`}
                          onMouseDown={(e) => !isMilestone && handleDragStart(e, task, 'move')}
                          onClick={() => isMilestone && onTaskClick(task)}
                        >
                          {/* Left resize handle */}
                          {!isMilestone && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 rounded-l"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-left')}
                            />
                          )}

                          {/* Task title */}
                          {!isMilestone && style.width > 50 && (
                            <span
                              className="absolute inset-0 flex items-center px-3 text-xs text-white truncate"
                              onClick={() => onTaskClick(task)}
                            >
                              {task.title}
                            </span>
                          )}

                          {/* Right resize handle */}
                          {!isMilestone && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 rounded-r"
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-right')}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
