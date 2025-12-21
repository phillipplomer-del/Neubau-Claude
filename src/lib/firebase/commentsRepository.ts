/**
 * Firestore Comments Repository
 * Handles CRUD operations for sales comments in Firebase
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { SalesCommentDocument, FirestoreComment } from '@/types/firebase';
import type { CommentStatus, SalesComment } from '@/types/sales';

const COLLECTION_NAME = 'salesComments';

/**
 * Convert Firestore comment to app comment
 */
function firestoreCommentToSalesComment(firestoreComment: FirestoreComment): SalesComment {
  return {
    id: firestoreComment.id,
    name: firestoreComment.name,
    comment: firestoreComment.text,
    status: firestoreComment.status,
    createdAt: firestoreComment.createdAt.toDate(),
  };
}

/**
 * Get comments for a sales entry
 */
export async function getComments(
  entryId: string
): Promise<{ comments: SalesComment[]; status: CommentStatus } | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data() as SalesCommentDocument;
    const comments = data.comments.map(firestoreCommentToSalesComment);

    return {
      comments,
      status: data.commentStatus,
    };
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
}

/**
 * Save a new comment
 */
export async function saveComment(
  entryId: string,
  name: string,
  commentText: string,
  status: CommentStatus,
  deliveryNumber?: string,
  projektnummer?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    const docSnap = await getDoc(docRef);

    const newComment: FirestoreComment = {
      id: crypto.randomUUID(),
      name,
      text: commentText,
      status,
      createdAt: Timestamp.now(),
    };

    if (docSnap.exists()) {
      // Update existing document
      const existingData = docSnap.data() as SalesCommentDocument;
      await updateDoc(docRef, {
        comments: [...existingData.comments, newComment],
        commentStatus: status,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document
      const newDoc: SalesCommentDocument = {
        entryId,
        deliveryNumber,
        projektnummer,
        commentStatus: status,
        comments: [newComment],
        updatedAt: Timestamp.now(),
      };
      await setDoc(docRef, newDoc);
    }
  } catch (error) {
    console.error('Error saving comment:', error);
    throw error;
  }
}

/**
 * Update only the status (without adding a comment)
 */
export async function updateStatus(
  entryId: string,
  status: CommentStatus,
  deliveryNumber?: string,
  projektnummer?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        commentStatus: status,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document with status but no comments
      const newDoc: SalesCommentDocument = {
        entryId,
        deliveryNumber,
        projektnummer,
        commentStatus: status,
        comments: [],
        updatedAt: Timestamp.now(),
      };
      await setDoc(docRef, newDoc);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
}

/**
 * Delete a specific comment
 */
export async function deleteComment(
  entryId: string,
  commentId: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }

    const existingData = docSnap.data() as SalesCommentDocument;
    const updatedComments = existingData.comments.filter(c => c.id !== commentId);

    // Determine new status: use status from most recent comment, or 'none' if no comments left
    let newStatus: CommentStatus = 'none';
    if (updatedComments.length > 0) {
      // Sort by createdAt descending and get most recent comment's status
      const sortedComments = [...updatedComments].sort((a, b) =>
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );
      newStatus = sortedComments[0].status;
    }

    await updateDoc(docRef, {
      comments: updatedComments,
      commentStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Migrate local comments to Firebase (one-time migration)
 */
export async function migrateLocalComments(
  entryId: string,
  localComments: SalesComment[],
  localStatus: CommentStatus,
  deliveryNumber?: string,
  projektnummer?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, entryId);
    const docSnap = await getDoc(docRef);

    // Only migrate if Firebase doc doesn't exist or has no comments
    if (docSnap.exists()) {
      const existingData = docSnap.data() as SalesCommentDocument;
      if (existingData.comments.length > 0) {
        return; // Already has comments, don't overwrite
      }
    }

    // Convert local comments to Firestore format
    const firestoreComments: FirestoreComment[] = localComments.map((comment) => ({
      id: comment.id,
      name: comment.name,
      text: comment.comment,
      status: comment.status,
      createdAt: Timestamp.fromDate(comment.createdAt),
    }));

    const newDoc: SalesCommentDocument = {
      entryId,
      deliveryNumber,
      projektnummer,
      commentStatus: localStatus,
      comments: firestoreComments,
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, newDoc);
  } catch (error) {
    console.error('Error migrating local comments:', error);
    throw error;
  }
}
