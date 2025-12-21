/**
 * Comment Tooltip Component
 * Shows comment information on hover for rows with comments
 */

import { useState, useEffect } from 'react';
import type { SalesComment, CommentStatus } from '@/types/sales';
import { getComments } from '@/lib/firebase/commentsRepository';

interface CommentTooltipProps {
  entryId: string;
  status: CommentStatus;
  mouseX: number;
  mouseY: number;
}

export default function CommentTooltip({ entryId, status, mouseX, mouseY }: CommentTooltipProps) {
  const [comments, setComments] = useState<SalesComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComments() {
      try {
        const data = await getComments(entryId);
        if (data) {
          setComments(data.comments);
        }
      } catch (error) {
        console.error('Error loading comments for tooltip:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [entryId]);

  const getStatusLabel = (status: CommentStatus): string => {
    switch (status) {
      case 'critical':
        return 'Kritisch';
      case 'at-risk':
        return 'Gefährdet';
      case 'watched':
        return 'Beobachtet';
      default:
        return 'Keine Markierung';
    }
  };

  const getStatusColor = (status: CommentStatus): string => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'at-risk':
        return 'text-orange-600';
      case 'watched':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-lg"
      style={{
        left: `${mouseX + 15}px`,
        top: `${mouseY + 15}px`,
        pointerEvents: 'none',
      }}
    >
      {loading ? (
        <div className="text-sm text-gray-500">Lade Kommentare...</div>
      ) : (
        <>
          {/* Status Header */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className={`text-sm font-semibold ${getStatusColor(status)}`}>
              {getStatusLabel(status)}
            </div>
          </div>

          {/* Comments */}
          {comments.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <div className="font-medium text-gray-900">{comment.name}</div>
                  <div className="text-gray-700 mt-1 whitespace-pre-wrap">{comment.comment}</div>
                  <div className="text-gray-500 mt-1 text-xs">
                    {new Date(comment.createdAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Keine Kommentare vorhanden</div>
          )}
        </>
      )}
    </div>
  );
}
