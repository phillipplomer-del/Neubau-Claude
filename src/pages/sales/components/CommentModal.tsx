/**
 * Comment Modal Component
 * Modal dialog for adding/editing comments on sales entries
 */

import { useState } from 'react';
import { useSalesComments } from '@/hooks/useSalesComments';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { CommentStatus, SalesEntry } from '@/types/sales';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: SalesEntry;
}

export default function CommentModal({ isOpen, onClose, entry }: CommentModalProps) {
  const { comments, commentStatus, loading, addComment, removeComment } = useSalesComments(
    entry.id,
    entry.deliveryNumber,
    entry.projektnummer
  );

  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<CommentStatus>(commentStatus || 'none');
  const [saving, setSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !comment.trim()) {
      alert('Bitte Name und Kommentar eingeben');
      return;
    }

    try {
      setSaving(true);
      await addComment(name, comment, status);
      setName('');
      setComment('');
      setStatus('none');
      onClose();
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Fehler beim Speichern des Kommentars');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setComment('');
    setStatus(commentStatus || 'none');
    onClose();
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Kommentar wirklich löschen?')) {
      return;
    }

    try {
      setDeletingCommentId(commentId);
      await removeComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Fehler beim Löschen des Kommentars');
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Kommentar hinzufügen</h2>
          <p className="mt-1 text-sm text-gray-600">
            {entry.deliveryNumber && `Bestellung: ${entry.deliveryNumber}`}
            {entry.projektnummer && ` | PNR: ${entry.projektnummer}`}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="comment-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <Input
              id="comment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ihr Name"
            />
          </div>

          {/* Comment Field */}
          <div>
            <label htmlFor="comment-text" className="block text-sm font-medium text-gray-700 mb-1">
              Kommentar
            </label>
            <textarea
              id="comment-text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Kommentar eingeben..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Markierung
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="none"
                  checked={status === 'none'}
                  onChange={() => setStatus('none')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Keine Markierung</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="at-risk"
                  checked={status === 'at-risk'}
                  onChange={() => setStatus('at-risk')}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="inline-block w-3 h-3 bg-orange-400 rounded mr-1"></span>
                  Orange - Gefährdet
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="critical"
                  checked={status === 'critical'}
                  onChange={() => setStatus('critical')}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span>
                  Rot - Kritisch
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="watched"
                  checked={status === 'watched'}
                  onChange={() => setStatus('watched')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded mr-1"></span>
                  Lila - Beobachtet (alle Einträge mit dieser Projektnummer)
                </span>
              </label>
            </div>
          </div>

          {/* Existing Comments */}
          {loading ? (
            <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
              Lade Kommentare...
            </div>
          ) : comments.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Bisherige Kommentare ({comments.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="text-xs bg-gray-50 p-2 rounded relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{c.name}</div>
                          {c.status === 'critical' && (
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full" title="Kritisch"></span>
                          )}
                          {c.status === 'at-risk' && (
                            <span className="inline-block w-2 h-2 bg-orange-400 rounded-full" title="Gefährdet"></span>
                          )}
                          {c.status === 'watched' && (
                            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full" title="Beobachtet"></span>
                          )}
                        </div>
                        <div className="text-gray-700 mt-0.5">{c.comment}</div>
                        <div className="text-gray-500 mt-0.5 text-[10px]">
                          {new Date(c.createdAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingCommentId === c.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
                        title="Löschen"
                      >
                        {deletingCommentId === c.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
}
