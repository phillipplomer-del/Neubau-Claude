import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Milestone } from 'lucide-react';
import type { PMColumn, PMTask, UpdateTaskInput } from '@/types/planner';
import { PRIORITY_COLORS } from '@/types/planner';

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
      columnTasks.sort((a, b) => {
        const aStart = a.startDate?.toDate().getTime() || 0;
        const bStart = b.startDate?.toDate().getTime() || 0;
        return aStart - bStart;
      });
      map.set(columnId, columnTasks);
    }
    return map;
  }, [columns, tasks]);

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
            {/* Task List */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 3rem)' }}>
              {columns.map((column) => {
                const columnTasks = tasksByColumn.get(column.id) || [];
                if (columnTasks.length === 0) return null;

                return (
                  <div key={column.id}>
                    {/* Column Header */}
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <div className="flex items-center gap-2">
                        {column.color && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                        )}
                        <span className="text-sm font-medium">{column.name}</span>
                      </div>
                    </div>
                    {/* Tasks */}
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="h-10 px-4 flex items-center gap-2 border-b border-border hover:bg-muted/50 cursor-pointer"
                      >
                        {task.taskType === 'milestone' && (
                          <Milestone className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
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

              {/* Task Rows */}
              <div className="relative">
                {columns.map((column) => {
                  const columnTasks = tasksByColumn.get(column.id) || [];
                  if (columnTasks.length === 0) return null;

                  return (
                    <div key={column.id}>
                      {/* Column Header Row */}
                      <div className="h-[33px] bg-muted/30 border-b border-border" />

                      {/* Task Bars */}
                      {columnTasks.map((task) => {
                        const style = getTaskStyle(task);
                        const isMilestone = task.taskType === 'milestone';

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
                                onClick={() => onTaskClick(task)}
                                className={`absolute top-1/2 -translate-y-1/2 cursor-pointer transition-all hover:opacity-80 ${
                                  isMilestone
                                    ? 'rotate-45 bg-amber-500'
                                    : 'rounded h-6'
                                }`}
                                style={{
                                  left: style.left,
                                  width: isMilestone ? 16 : style.width,
                                  height: isMilestone ? 16 : undefined,
                                  backgroundColor: isMilestone
                                    ? undefined
                                    : column.color || PRIORITY_COLORS[task.priority],
                                }}
                                title={`${task.title}${task.assignee ? ` - ${task.assignee}` : ''}`}
                              >
                                {!isMilestone && style.width > 50 && (
                                  <span className="absolute inset-0 flex items-center px-2 text-xs text-white truncate">
                                    {task.title}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
