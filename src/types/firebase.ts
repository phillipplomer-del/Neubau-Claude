/**
 * Firebase/Firestore specific types
 */

import type { Timestamp } from 'firebase/firestore';
import type { CommentStatus } from './sales';

/**
 * Comment as stored in Firestore
 */
export interface FirestoreComment {
  id: string;
  name: string;
  text: string;
  status: CommentStatus;
  createdAt: Timestamp;
}

/**
 * Sales comment document in Firestore
 * Collection: 'salesComments'
 * Document ID: SalesEntry.id (from IndexedDB)
 */
export interface SalesCommentDocument {
  entryId: string;
  deliveryNumber?: string;
  projektnummer?: string;
  commentStatus: CommentStatus;
  comments: FirestoreComment[];
  updatedAt: Timestamp;
}
