/**
 * Hook for managing sales comments via Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { getComments, saveComment, migrateLocalComments, deleteComment } from '@/lib/firebase/commentsRepository';
import { watchProject, unwatchProject } from '@/lib/firebase/projectWatchRepository';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import type { SalesComment, CommentStatus } from '@/types/sales';

export interface UseSalesCommentsReturn {
  comments: SalesComment[];
  commentStatus: CommentStatus;
  loading: boolean;
  error: string | null;
  addComment: (name: string, commentText: string, status: CommentStatus) => Promise<void>;
  removeComment: (commentId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSalesComments(
  entryId: string | undefined,
  deliveryNumber?: string,
  projektnummer?: string
): UseSalesCommentsReturn {
  const [comments, setComments] = useState<SalesComment[]>([]);
  const [commentStatus, setCommentStatus] = useState<CommentStatus>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!entryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get from Firebase
      const firebaseData = await getComments(entryId);

      if (firebaseData) {
        setComments(firebaseData.comments);
        setCommentStatus(firebaseData.status);
      } else {
        // No Firebase data - check for local comments to migrate
        const localEntry = await salesRepository.getById(entryId);

        if (localEntry?.comments && localEntry.comments.length > 0) {
          // Migrate local comments to Firebase
          await migrateLocalComments(
            entryId,
            localEntry.comments,
            localEntry.commentStatus || 'none',
            deliveryNumber,
            projektnummer
          );

          // Set migrated data
          setComments(localEntry.comments);
          setCommentStatus(localEntry.commentStatus || 'none');

          // Optional: Clean up local storage
          await salesRepository.update({
            ...localEntry,
            comments: undefined,
            commentStatus: undefined,
          });
        } else {
          // No data anywhere
          setComments([]);
          setCommentStatus('none');
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Fehler beim Laden der Kommentare';
      setError(errorMessage);
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [entryId, deliveryNumber, projektnummer]);

  const addComment = useCallback(
    async (name: string, commentText: string, status: CommentStatus) => {
      if (!entryId) {
        throw new Error('Entry ID is required');
      }

      try {
        // If status is 'watched', handle it differently (project-wide)
        if (status === 'watched') {
          if (!projektnummer) {
            throw new Error('Projektnummer ist erforderlich für beobachtete Projekte');
          }

          // Add to watched projects
          await watchProject(projektnummer, name, commentText);

          // Also save as regular comment for this entry
          const newComment: SalesComment = {
            id: crypto.randomUUID(),
            name,
            comment: commentText,
            status,
            createdAt: new Date(),
          };

          setComments((prev) => [...prev, newComment]);
          setCommentStatus(status);

          await saveComment(entryId, name, commentText, status, deliveryNumber, projektnummer);
        } else {
          // Regular comment (at-risk, critical, none)
          const newComment: SalesComment = {
            id: crypto.randomUUID(),
            name,
            comment: commentText,
            status,
            createdAt: new Date(),
          };

          setComments((prev) => [...prev, newComment]);
          setCommentStatus(status);

          // Save to Firebase
          await saveComment(entryId, name, commentText, status, deliveryNumber, projektnummer);
        }
      } catch (err) {
        // Revert on error
        await fetchComments();
        throw err;
      }
    },
    [entryId, deliveryNumber, projektnummer, fetchComments]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!entryId) {
        throw new Error('Entry ID is required');
      }

      try {
        // Find the comment to check if it's a 'watched' status
        const commentToDelete = comments.find(c => c.id === commentId);

        // Optimistic update
        setComments((prev) => prev.filter(c => c.id !== commentId));

        // Delete from Firebase
        await deleteComment(entryId, commentId);

        // If it was a 'watched' comment, also remove from watchedProjects
        if (commentToDelete?.status === 'watched' && projektnummer) {
          await unwatchProject(projektnummer);
        }

        // Refresh to get updated status
        await fetchComments();
      } catch (err) {
        // Revert on error
        await fetchComments();
        throw err;
      }
    },
    [entryId, fetchComments, comments, projektnummer]
  );

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    commentStatus,
    loading,
    error,
    addComment,
    removeComment,
    refresh: fetchComments,
  };
}
