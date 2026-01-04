import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Kanban, List, GanttChart, Plus, Settings, Filter } from 'lucide-react';
import { usePlannerBoard } from '@/hooks/usePlannerBoard';
import { useUserContext } from '@/contexts/UserContext';
import type { PMViewType, PMTask, BoardFilters } from '@/types/planner';
import KanbanBoard from './components/KanbanBoard';
import TaskListView from './components/TaskListView';
import GanttTaskReactView from './components/GanttTaskReactView';
import TaskModal from './components/TaskModal';
import AddColumnModal from './components/AddColumnModal';

const VIEW_OPTIONS: { value: PMViewType; label: string; icon: typeof Kanban }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'list', label: 'Liste', icon: List },
  { value: 'gantt', label: 'Gantt', icon: GanttChart },
];

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useUserContext();

  const {
    board,
    columns,
    tasks,
    loading,
    error,
    updateBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
  } = usePlannerBoard(boardId);

  const [currentView, setCurrentView] = useState<PMViewType>('kanban');
  const [selectedTask, setSelectedTask] = useState<PMTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>({
    search: '',
    assignee: null,
    priority: null,
    labels: [],
    showCompleted: true,
  });

  // Set default view from board settings
  useEffect(() => {
    if (board?.defaultView) {
      setCurrentView(board.defaultView);
    }
  }, [board?.defaultView]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Assignee filter
    if (filters.assignee && task.assignee !== filters.assignee) {
      return false;
    }
    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    // Labels filter
    if (filters.labels.length > 0) {
      const taskLabelIds = task.labels.map((l) => l.id);
      if (!filters.labels.some((id) => taskLabelIds.includes(id))) {
        return false;
      }
    }
    return true;
  });

  // Get unique assignees for filter
  const uniqueAssignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))] as string[];

  const handleOpenTask = (task: PMTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = (columnId: string) => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleTaskSave = async (taskData: Partial<PMTask> & { columnId?: string }) => {
    if (selectedTask) {
      // Update existing task
      await updateTask(selectedTask.id, taskData);
    } else if (taskData.columnId) {
      // Create new task
      await createTask({
        boardId: boardId!,
        columnId: taskData.columnId,
        title: taskData.title || 'Neue Aufgabe',
        description: taskData.description,
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee,
        createdBy: user?.name || 'Unbekannt',
      });
    }
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId);
    setShowTaskModal(false);
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">{error || 'Board nicht gefunden'}</p>
        <button
          onClick={() => navigate('/planner')}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/planner')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{board.name}</h1>
            {board.projektnummer && (
              <p className="text-sm text-muted-foreground">Projekt: {board.projektnummer}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex bg-muted rounded-lg p-1">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setCurrentView(option.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
                    ${currentView === option.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Add Column (only for Kanban) */}
          {currentView === 'kanban' && (
            <button
              onClick={() => setShowAddColumnModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-border hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              Spalte
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
          <input
            type="text"
            placeholder="Suchen..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <select
            value={filters.assignee || ''}
            onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value || null }))}
            className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Alle Bearbeiter</option>
            {uniqueAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>

          <select
            value={filters.priority || ''}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as never || null }))}
            className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>

          <button
            onClick={() => setFilters({
              search: '',
              assignee: null,
              priority: null,
              labels: [],
              showCompleted: true,
            })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'kanban' && (
          <KanbanBoard
            columns={columns}
            tasks={filteredTasks}
            onTaskClick={handleOpenTask}
            onTaskCreate={handleCreateTask}
            onTaskMove={moveTask}
            onColumnReorder={reorderColumns}
            onColumnUpdate={updateColumn}
            onColumnDelete={deleteColumn}
          />
        )}

        {currentView === 'list' && (
          <TaskListView
            columns={columns}
            tasks={filteredTasks}
            onTaskClick={handleOpenTask}
            onTaskUpdate={updateTask}
          />
        )}

        {currentView === 'gantt' && (
          <GanttTaskReactView
            board={board}
            columns={columns}
            tasks={filteredTasks}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onMoveTask={moveTask}
          />
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          columns={columns}
          boardId={boardId!}
          userName={user?.name || 'Unbekannt'}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
        />
      )}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <AddColumnModal
          boardId={boardId!}
          nextOrder={columns.length}
          onClose={() => setShowAddColumnModal(false)}
          onCreate={createColumn}
        />
      )}
    </div>
  );
}
