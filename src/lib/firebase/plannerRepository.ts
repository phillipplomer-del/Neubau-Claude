/**
 * Firestore Planner Repository
 * Handles CRUD operations for Planner boards, columns, and tasks
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type {
  PMBoard,
  PMColumn,
  PMTask,
  PMTaskComment,
  CreateBoardInput,
  UpdateBoardInput,
  CreateColumnInput,
  UpdateColumnInput,
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
} from '@/types/planner';
import { PROJECT_TEMPLATE } from '@/types/planner';

// Collection names
const BOARDS_COLLECTION = 'pmBoards';
const COLUMNS_COLLECTION = 'pmColumns';
const TASKS_COLLECTION = 'pmTasks';
const COMMENTS_COLLECTION = 'pmTaskComments';

// ============================================
// BOARD OPERATIONS
// ============================================

/**
 * Create a new board with default columns
 * For project-specific boards (with projektnummer), uses PROJECT_TEMPLATE
 * For global boards, uses simple status-based columns
 */
export async function createBoard(input: CreateBoardInput): Promise<string> {
  const boardRef = doc(collection(db, BOARDS_COLLECTION));
  const boardId = boardRef.id;
  // Use project template when isGlobal is explicitly false (even without projektnummer)
  const isProjectBoard = input.isGlobal === false;

  // Create the board - only include defined fields (Firebase doesn't accept undefined)
  const newBoard: Record<string, unknown> = {
    id: boardId,
    name: input.name,
    isGlobal: input.isGlobal ?? !input.projektnummer,
    columns: [],
    defaultView: input.defaultView ?? 'kanban',
    createdBy: input.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    archived: false,
  };

  // Only add optional fields if they have values
  if (input.description) {
    newBoard.description = input.description;
  }
  if (input.projektnummer) {
    newBoard.projektnummer = input.projektnummer;
  }

  // Use batch to create board and default columns atomically
  const batch = writeBatch(db);
  batch.set(boardRef, newBoard);

  const columnIds: string[] = [];

  if (isProjectBoard) {
    // Use PROJECT_TEMPLATE for project-specific boards
    // Calculate dates: project starts today
    const projectStart = new Date();
    projectStart.setHours(0, 0, 0, 0);

    // First pass: Generate all task IDs and build code -> taskId map
    const codeToTaskId = new Map<string, string>();
    const taskDataList: Array<{
      taskRef: ReturnType<typeof doc>;
      taskId: string;
      columnId: string;
      templateTask: (typeof PROJECT_TEMPLATE)[0]['tasks'][0];
      taskStartDate: Date;
      taskDueDate: Date;
      order: number;
    }> = [];

    let cumulativeDays = 0;
    let phaseIndex = 0;

    for (const phase of PROJECT_TEMPLATE) {
      const columnRef = doc(collection(db, COLUMNS_COLLECTION));
      const columnId = columnRef.id;
      columnIds.push(columnId);

      const taskIds: string[] = [];

      // Phase start date
      const phaseStartDate = new Date(projectStart);
      phaseStartDate.setDate(phaseStartDate.getDate() + cumulativeDays);

      // Create task refs and build code map
      let taskIndex = 0;
      for (const templateTask of phase.tasks) {
        const taskRef = doc(collection(db, TASKS_COLLECTION));
        const taskId = taskRef.id;
        taskIds.push(taskId);

        // Map code to taskId for dependency resolution
        codeToTaskId.set(templateTask.code, taskId);

        // Calculate task start date
        const taskStartDate = new Date(phaseStartDate);
        taskStartDate.setDate(taskStartDate.getDate() + templateTask.startOffsetDays);

        // Calculate task due date
        const taskDueDate = new Date(taskStartDate);
        if (templateTask.taskType === 'milestone') {
          // Milestone: due date = start date
        } else {
          // Activity: due date = start date + duration
          taskDueDate.setDate(taskDueDate.getDate() + templateTask.durationDays);
        }

        taskDataList.push({
          taskRef,
          taskId,
          columnId,
          templateTask,
          taskStartDate,
          taskDueDate,
          order: taskIndex,
        });

        taskIndex++;
      }

      // Create column with task IDs
      const newColumn: Record<string, unknown> = {
        id: columnId,
        boardId,
        name: phase.name,
        color: phase.color,
        order: phaseIndex,
        taskIds,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      batch.set(columnRef, newColumn);

      // Update cumulative days for next phase
      cumulativeDays += phase.durationWeeks * 7;
      phaseIndex++;
    }

    // Second pass: Create tasks with resolved dependencies
    for (const taskData of taskDataList) {
      // Resolve predecessor codes to task IDs
      const dependencies: Array<{ predecessorId: string; type: string; lagDays: number }> = [];
      if (taskData.templateTask.predecessorCodes) {
        for (const predCode of taskData.templateTask.predecessorCodes) {
          const predTaskId = codeToTaskId.get(predCode);
          if (predTaskId) {
            dependencies.push({
              predecessorId: predTaskId,
              type: 'FS', // Finish-to-Start
              lagDays: 0,
            });
          }
        }
      }

      const newTask: Record<string, unknown> = {
        id: taskData.taskId,
        boardId,
        columnId: taskData.columnId,
        title: taskData.templateTask.title,
        code: taskData.templateTask.code,
        taskType: taskData.templateTask.taskType,
        order: taskData.order,
        priority: taskData.templateTask.taskType === 'milestone' ? 'high' : 'medium',
        labels: [],
        checklist: [],
        completionPercentage: 0,
        dependencies,
        createdBy: input.createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        hasComments: false,
        // Add calculated dates
        startDate: Timestamp.fromDate(taskData.taskStartDate),
        dueDate: Timestamp.fromDate(taskData.taskDueDate),
      };

      // Add projektnummer to task if available
      if (input.projektnummer) {
        newTask.projektnummer = input.projektnummer;
      }

      batch.set(taskData.taskRef, newTask);
    }
  } else {
    // Use simple status-based columns for global boards
    const defaultColumns: Omit<CreateColumnInput, 'boardId'>[] = [
      { name: 'Backlog', order: 0, color: '#94A3B8' },
      { name: 'To Do', order: 1, color: '#3B82F6' },
      { name: 'In Arbeit', order: 2, color: '#F59E0B' },
      { name: 'Review', order: 3, color: '#8B5CF6' },
      { name: 'Erledigt', order: 4, color: '#10B981' },
    ];

    for (const colInput of defaultColumns) {
      const columnRef = doc(collection(db, COLUMNS_COLLECTION));
      const columnId = columnRef.id;
      columnIds.push(columnId);

      const newColumn: Record<string, unknown> = {
        id: columnId,
        boardId,
        name: colInput.name,
        order: colInput.order,
        taskIds: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (colInput.color) {
        newColumn.color = colInput.color;
      }

      batch.set(columnRef, newColumn);
    }
  }

  // Update board with column IDs
  batch.update(boardRef, { columns: columnIds });

  await batch.commit();
  return boardId;
}

/**
 * Get a single board by ID
 */
export async function getBoard(boardId: string): Promise<PMBoard | null> {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as PMBoard) : null;
}

/**
 * Get all boards
 */
export async function getBoards(): Promise<PMBoard[]> {
  const q = query(
    collection(db, BOARDS_COLLECTION),
    where('archived', '==', false),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as PMBoard);
}

/**
 * Get boards for a specific project
 */
export async function getBoardsByProject(projektnummer: string): Promise<PMBoard[]> {
  const q = query(
    collection(db, BOARDS_COLLECTION),
    where('projektnummer', '==', projektnummer),
    where('archived', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as PMBoard);
}

/**
 * Update a board
 */
export async function updateBoard(boardId: string, input: UpdateBoardInput): Promise<void> {
  const docRef = doc(db, BOARDS_COLLECTION, boardId);
  await updateDoc(docRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a board and all its columns and tasks
 */
export async function deleteBoard(boardId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all tasks in this board
  const tasksQuery = query(collection(db, TASKS_COLLECTION), where('boardId', '==', boardId));
  const tasksSnapshot = await getDocs(tasksQuery);
  tasksSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete all columns in this board
  const columnsQuery = query(collection(db, COLUMNS_COLLECTION), where('boardId', '==', boardId));
  const columnsSnapshot = await getDocs(columnsQuery);
  columnsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete the board itself
  batch.delete(doc(db, BOARDS_COLLECTION, boardId));

  await batch.commit();
}

/**
 * Subscribe to boards (real-time updates)
 */
export function subscribeToBoards(
  callback: (boards: PMBoard[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Simple query without composite index requirement
  const q = query(collection(db, BOARDS_COLLECTION));

  return onSnapshot(
    q,
    (snapshot) => {
      // Filter and sort in memory to avoid composite index
      const boards = snapshot.docs
        .map((doc) => doc.data() as PMBoard)
        .filter((board) => !board.archived)
        .sort((a, b) => {
          const timeA = a.updatedAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
      callback(boards);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Subscribe to a single board (real-time updates)
 */
export function subscribeToBoard(
  boardId: string,
  callback: (board: PMBoard | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, BOARDS_COLLECTION, boardId), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as PMBoard) : null);
  });
}

// ============================================
// COLUMN OPERATIONS
// ============================================

/**
 * Create a new column
 */
export async function createColumn(input: CreateColumnInput): Promise<string> {
  const columnRef = doc(collection(db, COLUMNS_COLLECTION));
  const columnId = columnRef.id;

  // Build column object without undefined fields (Firebase doesn't accept undefined)
  const newColumn: Record<string, unknown> = {
    id: columnId,
    boardId: input.boardId,
    name: input.name,
    order: input.order,
    taskIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Only add optional fields if they have values
  if (input.color) {
    newColumn.color = input.color;
  }
  if (input.limit !== undefined) {
    newColumn.limit = input.limit;
  }

  const batch = writeBatch(db);
  batch.set(columnRef, newColumn);

  // Update board's columns array
  const boardRef = doc(db, BOARDS_COLLECTION, input.boardId);
  const boardSnap = await getDoc(boardRef);
  if (boardSnap.exists()) {
    const board = boardSnap.data() as PMBoard;
    batch.update(boardRef, {
      columns: [...board.columns, columnId],
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return columnId;
}

/**
 * Get columns for a board
 */
export async function getColumns(boardId: string): Promise<PMColumn[]> {
  const q = query(
    collection(db, COLUMNS_COLLECTION),
    where('boardId', '==', boardId)
  );
  const snapshot = await getDocs(q);
  // Sort in memory to avoid composite index
  return snapshot.docs
    .map((doc) => doc.data() as PMColumn)
    .sort((a, b) => a.order - b.order);
}

/**
 * Update a column
 */
export async function updateColumn(columnId: string, input: UpdateColumnInput): Promise<void> {
  const docRef = doc(db, COLUMNS_COLLECTION, columnId);
  await updateDoc(docRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a column and move its tasks to another column
 */
export async function deleteColumn(
  columnId: string,
  moveTasksToColumnId?: string
): Promise<void> {
  const columnRef = doc(db, COLUMNS_COLLECTION, columnId);
  const columnSnap = await getDoc(columnRef);

  if (!columnSnap.exists()) {
    throw new Error('Column not found');
  }

  const column = columnSnap.data() as PMColumn;
  const batch = writeBatch(db);

  // Move tasks if target column specified, otherwise delete them
  if (moveTasksToColumnId && column.taskIds.length > 0) {
    const targetColumnRef = doc(db, COLUMNS_COLLECTION, moveTasksToColumnId);
    const targetColumnSnap = await getDoc(targetColumnRef);

    if (targetColumnSnap.exists()) {
      const targetColumn = targetColumnSnap.data() as PMColumn;

      // Update each task's columnId
      for (const taskId of column.taskIds) {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        batch.update(taskRef, {
          columnId: moveTasksToColumnId,
          updatedAt: serverTimestamp(),
        });
      }

      // Add task IDs to target column
      batch.update(targetColumnRef, {
        taskIds: [...targetColumn.taskIds, ...column.taskIds],
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    // Delete all tasks in this column
    for (const taskId of column.taskIds) {
      batch.delete(doc(db, TASKS_COLLECTION, taskId));
    }
  }

  // Remove column from board's columns array
  const boardRef = doc(db, BOARDS_COLLECTION, column.boardId);
  const boardSnap = await getDoc(boardRef);
  if (boardSnap.exists()) {
    const board = boardSnap.data() as PMBoard;
    batch.update(boardRef, {
      columns: board.columns.filter((id) => id !== columnId),
      updatedAt: serverTimestamp(),
    });
  }

  // Delete the column
  batch.delete(columnRef);

  await batch.commit();
}

/**
 * Reorder columns within a board
 */
export async function reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
  const batch = writeBatch(db);

  // Update order for each column
  columnIds.forEach((columnId, index) => {
    const columnRef = doc(db, COLUMNS_COLLECTION, columnId);
    batch.update(columnRef, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });

  // Update board's columns array
  const boardRef = doc(db, BOARDS_COLLECTION, boardId);
  batch.update(boardRef, {
    columns: columnIds,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Subscribe to columns for a board (real-time updates)
 */
export function subscribeToColumns(
  boardId: string,
  callback: (columns: PMColumn[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Simple query without composite index requirement
  const q = query(
    collection(db, COLUMNS_COLLECTION),
    where('boardId', '==', boardId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      // Sort in memory to avoid composite index
      const columns = snapshot.docs
        .map((doc) => doc.data() as PMColumn)
        .sort((a, b) => a.order - b.order);
      callback(columns);
    },
    (error) => {
      console.error('Columns subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

// ============================================
// TASK OPERATIONS
// ============================================

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const taskRef = doc(collection(db, TASKS_COLLECTION));
  const taskId = taskRef.id;

  // Get current column to determine order
  const columnRef = doc(db, COLUMNS_COLLECTION, input.columnId);
  const columnSnap = await getDoc(columnRef);

  if (!columnSnap.exists()) {
    throw new Error('Column not found');
  }

  const column = columnSnap.data() as PMColumn;
  const newOrder = column.taskIds.length;

  // Build task object without undefined fields (Firebase doesn't accept undefined)
  const newTask: Record<string, unknown> = {
    id: taskId,
    boardId: input.boardId,
    columnId: input.columnId,
    title: input.title,
    order: newOrder,
    priority: input.priority ?? 'medium',
    labels: input.labels ?? [],
    checklist: [],
    completionPercentage: 0,
    dependencies: [],
    createdBy: input.createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    hasComments: false,
  };

  // Only add optional fields if they have values
  if (input.projektnummer) {
    newTask.projektnummer = input.projektnummer;
  }
  if (input.description) {
    newTask.description = input.description;
  }
  if (input.startDate) {
    newTask.startDate = Timestamp.fromDate(input.startDate);
  }
  if (input.dueDate) {
    newTask.dueDate = Timestamp.fromDate(input.dueDate);
  }
  if (input.assignee) {
    newTask.assignee = input.assignee;
  }
  if (input.code) {
    newTask.code = input.code;
  }
  if (input.taskType) {
    newTask.taskType = input.taskType;
  }

  const batch = writeBatch(db);
  batch.set(taskRef, newTask);

  // Add task to column's taskIds
  batch.update(columnRef, {
    taskIds: [...column.taskIds, taskId],
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return taskId;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<PMTask | null> {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as PMTask) : null;
}

/**
 * Get all tasks for a board
 */
export async function getTasks(boardId: string): Promise<PMTask[]> {
  const q = query(collection(db, TASKS_COLLECTION), where('boardId', '==', boardId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as PMTask);
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<void> {
  const docRef = doc(db, TASKS_COLLECTION, taskId);

  const updateData: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  // Handle optional fields - only add if value is defined and not null
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) {
    updateData.description = input.description || '';
  }
  if (input.assignee !== undefined) {
    updateData.assignee = input.assignee || '';
  }
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.labels !== undefined) updateData.labels = input.labels;
  if (input.checklist !== undefined) {
    updateData.checklist = input.checklist;
    // Recalculate completion percentage
    const completed = input.checklist.filter((item) => item.completed).length;
    updateData.completionPercentage =
      input.checklist.length > 0 ? Math.round((completed / input.checklist.length) * 100) : 0;
  }
  if (input.dependencies !== undefined) updateData.dependencies = input.dependencies;

  // Handle dates - use deleteField() for null values to properly clear them
  if (input.startDate !== undefined) {
    if (input.startDate) {
      updateData.startDate = Timestamp.fromDate(input.startDate);
    } else {
      updateData.startDate = null;
    }
  }
  if (input.dueDate !== undefined) {
    if (input.dueDate) {
      updateData.dueDate = Timestamp.fromDate(input.dueDate);
    } else {
      updateData.dueDate = null;
    }
  }
  if (input.completedAt !== undefined) {
    if (input.completedAt) {
      updateData.completedAt = Timestamp.fromDate(input.completedAt);
    } else {
      updateData.completedAt = null;
    }
  }

  await updateDoc(docRef, updateData);
}

/**
 * Move a task to a different column and/or position
 */
export async function moveTask(input: MoveTaskInput): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION, input.taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    throw new Error('Task not found');
  }

  const task = taskSnap.data() as PMTask;
  const sourceColumnId = task.columnId;

  const batch = writeBatch(db);

  // Update task's columnId and order
  batch.update(taskRef, {
    columnId: input.targetColumnId,
    order: input.targetOrder,
    updatedAt: serverTimestamp(),
  });

  // Remove from source column
  if (sourceColumnId !== input.targetColumnId) {
    const sourceColumnRef = doc(db, COLUMNS_COLLECTION, sourceColumnId);
    const sourceColumnSnap = await getDoc(sourceColumnRef);

    if (sourceColumnSnap.exists()) {
      const sourceColumn = sourceColumnSnap.data() as PMColumn;
      batch.update(sourceColumnRef, {
        taskIds: sourceColumn.taskIds.filter((id) => id !== input.taskId),
        updatedAt: serverTimestamp(),
      });
    }

    // Add to target column
    const targetColumnRef = doc(db, COLUMNS_COLLECTION, input.targetColumnId);
    const targetColumnSnap = await getDoc(targetColumnRef);

    if (targetColumnSnap.exists()) {
      const targetColumn = targetColumnSnap.data() as PMColumn;
      const newTaskIds = [...targetColumn.taskIds];
      newTaskIds.splice(input.targetOrder, 0, input.taskId);
      batch.update(targetColumnRef, {
        taskIds: newTaskIds,
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    // Reorder within same column
    const columnRef = doc(db, COLUMNS_COLLECTION, sourceColumnId);
    const columnSnap = await getDoc(columnRef);

    if (columnSnap.exists()) {
      const column = columnSnap.data() as PMColumn;
      const currentIndex = column.taskIds.indexOf(input.taskId);
      const newTaskIds = [...column.taskIds];
      newTaskIds.splice(currentIndex, 1);
      newTaskIds.splice(input.targetOrder, 0, input.taskId);
      batch.update(columnRef, {
        taskIds: newTaskIds,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    return;
  }

  const task = taskSnap.data() as PMTask;
  const batch = writeBatch(db);

  // Remove from column
  const columnRef = doc(db, COLUMNS_COLLECTION, task.columnId);
  const columnSnap = await getDoc(columnRef);

  if (columnSnap.exists()) {
    const column = columnSnap.data() as PMColumn;
    batch.update(columnRef, {
      taskIds: column.taskIds.filter((id) => id !== taskId),
      updatedAt: serverTimestamp(),
    });
  }

  // Delete task comments
  const commentsQuery = query(collection(db, COMMENTS_COLLECTION), where('taskId', '==', taskId));
  const commentsSnapshot = await getDocs(commentsQuery);
  commentsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete the task
  batch.delete(taskRef);

  await batch.commit();
}

/**
 * Subscribe to tasks for a board (real-time updates)
 */
export function subscribeToTasks(
  boardId: string,
  callback: (tasks: PMTask[]) => void
): Unsubscribe {
  const q = query(collection(db, TASKS_COLLECTION), where('boardId', '==', boardId));

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => doc.data() as PMTask);
    callback(tasks);
  });
}

// ============================================
// COMMENT OPERATIONS
// ============================================

/**
 * Add a comment to a task
 */
export async function addTaskComment(
  taskId: string,
  name: string,
  text: string
): Promise<string> {
  const commentRef = doc(collection(db, COMMENTS_COLLECTION));
  const commentId = commentRef.id;

  const newComment: PMTaskComment = {
    id: commentId,
    taskId,
    name,
    text,
    createdAt: Timestamp.now(),
  };

  const batch = writeBatch(db);
  batch.set(commentRef, newComment);

  // Update task's hasComments flag
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  batch.update(taskRef, {
    hasComments: true,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
  return commentId;
}

/**
 * Get comments for a task
 */
export async function getTaskComments(taskId: string): Promise<PMTaskComment[]> {
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('taskId', '==', taskId)
  );
  const snapshot = await getDocs(q);
  // Sort in memory to avoid composite index
  return snapshot.docs
    .map((doc) => doc.data() as PMTaskComment)
    .sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeA - timeB;
    });
}

/**
 * Delete a task comment
 */
export async function deleteTaskComment(taskId: string, commentId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete the comment
  batch.delete(doc(db, COMMENTS_COLLECTION, commentId));

  // Check if there are other comments
  const q = query(collection(db, COMMENTS_COLLECTION), where('taskId', '==', taskId));
  const snapshot = await getDocs(q);
  const remainingComments = snapshot.docs.filter((d) => d.id !== commentId);

  // Update task's hasComments flag
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  batch.update(taskRef, {
    hasComments: remainingComments.length > 0,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Subscribe to comments for a task (real-time updates)
 */
export function subscribeToTaskComments(
  taskId: string,
  callback: (comments: PMTaskComment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COMMENTS_COLLECTION),
    where('taskId', '==', taskId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      // Sort in memory to avoid composite index
      const comments = snapshot.docs
        .map((doc) => doc.data() as PMTaskComment)
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeA - timeB;
        });
      callback(comments);
    },
    (error) => {
      console.error('Comments subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}
