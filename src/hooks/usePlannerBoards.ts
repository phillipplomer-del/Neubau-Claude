/**
 * Hook for managing all Planner boards
 * Provides real-time updates for the board list
 */

import { useState, useEffect, useCallback } from 'react';
import type { PMBoard, CreateBoardInput } from '@/types/planner';
import { subscribeToBoards, createBoard, deleteBoard } from '@/lib/firebase/plannerRepository';

export interface UsePlannerBoardsReturn {
  boards: PMBoard[];
  loading: boolean;
  error: string | null;
  createBoard: (input: CreateBoardInput) => Promise<string>;
  deleteBoard: (boardId: string) => Promise<void>;
}

export function usePlannerBoards(): UsePlannerBoardsReturn {
  const [boards, setBoards] = useState<PMBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to boards
  useEffect(() => {
    const unsubscribe = subscribeToBoards(
      (updatedBoards) => {
        setBoards(updatedBoards);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to boards:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Create board
  const handleCreateBoard = useCallback(async (input: CreateBoardInput): Promise<string> => {
    try {
      const boardId = await createBoard(input);
      return boardId;
    } catch (err) {
      console.error('Error creating board:', err);
      throw err;
    }
  }, []);

  // Delete board
  const handleDeleteBoard = useCallback(async (boardId: string): Promise<void> => {
    try {
      await deleteBoard(boardId);
    } catch (err) {
      console.error('Error deleting board:', err);
      throw err;
    }
  }, []);

  return {
    boards,
    loading,
    error,
    createBoard: handleCreateBoard,
    deleteBoard: handleDeleteBoard,
  };
}
