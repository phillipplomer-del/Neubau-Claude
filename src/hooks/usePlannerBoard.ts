/**
 * Hook for managing a single Planner board with its columns and tasks
 * Provides real-time updates for the complete board state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  PMBoard,
  PMColumn,
  PMTask,
  UpdateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/planner';
import {
  getBoard,
  updateBoard,
  deleteBoard,
  subscribeToColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
  subscribeToTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
} from '@/lib/firebase/plannerRepository';

export interface UsePlannerBoardReturn {
  // Board state
  board: PMBoard | null;
  columns: PMColumn[];
  tasks: PMTask[];
  loading: boolean;
  error: string | null;

  // Computed
  tasksByColumn: Map<string, PMTask[]>;
  getTasksForColumn: (columnId: string) => PMTask[];

  // Board actions
  updateBoard: (input: UpdateBoardInput) => Promise<void>;
  deleteBoard: () => Promise<void>;

  // Column actions
  createColumn: (input: CreateColumnInput) => Promise<string>;
  updateColumn: (columnId: string, input: UpdateColumnInput) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;

  // Task actions
  createTask: (input: CreateTaskInput) => Promise<string>;
  updateTask: (taskId: string, input: UpdateTaskInput) => Promise<void>;
  moveTask: (taskId: string, newColumnId: string, newOrder: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export function usePlannerBoard(boardId: string | undefined): UsePlannerBoardReturn {
  const [board, setBoard] = useState<PMBoard | null>(null);
  const [columns, setColumns] = useState<PMColumn[]>([]);
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load board data
  useEffect(() => {
    if (!boardId) {
      setBoard(null);
      setColumns([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadBoard = async () => {
      try {
        const boardData = await getBoard(boardId);
        if (isMounted) {
          setBoard(boardData);
        }
      } catch (err) {
        console.error('Error loading board:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load board');
        }
      }
    };

    loadBoard();

    return () => {
      isMounted = false;
    };
  }, [boardId]);

  // Subscribe to columns
  useEffect(() => {
    if (!boardId) return;

    try {
      const unsubscribe = subscribeToColumns(boardId, (updatedColumns) => {
        setColumns(updatedColumns);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up columns listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [boardId]);

  // Subscribe to tasks
  useEffect(() => {
    if (!boardId) return;

    try {
      const unsubscribe = subscribeToTasks(boardId, (updatedTasks) => {
        setTasks(updatedTasks);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up tasks listener:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [boardId]);

  // Create a column order map for sorting tasks
  const columnOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach((col) => {
      map.set(col.id, col.order);
    });
    return map;
  }, [columns]);

  // Sorted tasks: by column order, then by task order within column
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // First sort by column order
      const colOrderA = columnOrderMap.get(a.columnId) ?? 999;
      const colOrderB = columnOrderMap.get(b.columnId) ?? 999;
      if (colOrderA !== colOrderB) {
        return colOrderA - colOrderB;
      }
      // Then sort by task order within column
      return a.order - b.order;
    });
  }, [tasks, columnOrderMap]);

  // Computed: tasks grouped by column
  const tasksByColumn = useMemo(() => {
    const map = new Map<string, PMTask[]>();

    // Initialize with empty arrays for all columns
    for (const column of columns) {
      map.set(column.id, []);
    }

    // Group tasks by column and sort by order
    for (const task of tasks) {
      const columnTasks = map.get(task.columnId) || [];
      columnTasks.push(task);
      map.set(task.columnId, columnTasks);
    }

    // Sort tasks within each column
    for (const [columnId, columnTasks] of map) {
      columnTasks.sort((a, b) => a.order - b.order);
      map.set(columnId, columnTasks);
    }

    return map;
  }, [columns, tasks]);

  // Get tasks for a specific column
  const getTasksForColumn = useCallback(
    (columnId: string): PMTask[] => {
      return tasksByColumn.get(columnId) || [];
    },
    [tasksByColumn]
  );

  // Board actions
  const handleUpdateBoard = useCallback(
    async (input: UpdateBoardInput): Promise<void> => {
      if (!boardId) throw new Error('No board ID');
      try {
        await updateBoard(boardId, input);
        // Local state will be updated via subscription
      } catch (err) {
        console.error('Error updating board:', err);
        throw err;
      }
    },
    [boardId]
  );

  const handleDeleteBoard = useCallback(async (): Promise<void> => {
    if (!boardId) throw new Error('No board ID');
    try {
      await deleteBoard(boardId);
    } catch (err) {
      console.error('Error deleting board:', err);
      throw err;
    }
  }, [boardId]);

  // Column actions
  const handleCreateColumn = useCallback(
    async (input: CreateColumnInput): Promise<string> => {
      if (!boardId) throw new Error('No board ID');
      try {
        const columnId = await createColumn({ ...input, boardId });
        return columnId;
      } catch (err) {
        console.error('Error creating column:', err);
        throw err;
      }
    },
    [boardId]
  );

  const handleUpdateColumn = useCallback(
    async (columnId: string, input: UpdateColumnInput): Promise<void> => {
      try {
        await updateColumn(columnId, input);
      } catch (err) {
        console.error('Error updating column:', err);
        throw err;
      }
    },
    []
  );

  const handleDeleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      if (!boardId) throw new Error('No board ID');
      try {
        await deleteColumn(boardId, columnId);
      } catch (err) {
        console.error('Error deleting column:', err);
        throw err;
      }
    },
    [boardId]
  );

  const handleReorderColumns = useCallback(
    async (columnIds: string[]): Promise<void> => {
      if (!boardId) throw new Error('No board ID');
      try {
        await reorderColumns(boardId, columnIds);
      } catch (err) {
        console.error('Error reordering columns:', err);
        throw err;
      }
    },
    [boardId]
  );

  // Task actions
  const handleCreateTask = useCallback(
    async (input: CreateTaskInput): Promise<string> => {
      if (!boardId) throw new Error('No board ID');
      try {
        const taskId = await createTask({ ...input, boardId });
        return taskId;
      } catch (err) {
        console.error('Error creating task:', err);
        throw err;
      }
    },
    [boardId]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, input: UpdateTaskInput): Promise<void> => {
      try {
        await updateTask(taskId, input);
      } catch (err) {
        console.error('Error updating task:', err);
        throw err;
      }
    },
    []
  );

  const handleMoveTask = useCallback(
    async (taskId: string, newColumnId: string, newOrder: number): Promise<void> => {
      try {
        await moveTask({ taskId, targetColumnId: newColumnId, targetOrder: newOrder });
      } catch (err) {
        console.error('Error moving task:', err);
        throw err;
      }
    },
    []
  );

  const handleDeleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        await deleteTask(taskId);
      } catch (err) {
        console.error('Error deleting task:', err);
        throw err;
      }
    },
    []
  );

  return {
    board,
    columns,
    tasks: sortedTasks,
    loading,
    error,
    tasksByColumn,
    getTasksForColumn,
    updateBoard: handleUpdateBoard,
    deleteBoard: handleDeleteBoard,
    createColumn: handleCreateColumn,
    updateColumn: handleUpdateColumn,
    deleteColumn: handleDeleteColumn,
    reorderColumns: handleReorderColumns,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    moveTask: handleMoveTask,
    deleteTask: handleDeleteTask,
  };
}
