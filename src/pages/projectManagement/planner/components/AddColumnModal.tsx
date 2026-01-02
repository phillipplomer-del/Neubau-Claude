import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateColumnInput } from '@/types/planner';

interface AddColumnModalProps {
  boardId: string;
  nextOrder: number;
  onClose: () => void;
  onCreate: (input: CreateColumnInput) => Promise<string>;
}

const PRESET_COLORS = [
  '#94A3B8', // Gray
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export default function AddColumnModal({
  boardId,
  nextOrder,
  onClose,
  onCreate,
}: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [limit, setLimit] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bitte geben Sie einen Namen ein');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCreate({
        boardId,
        name: name.trim(),
        color,
        order: nextOrder,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error creating column:', err);
      setError('Fehler beim Erstellen der Spalte');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-[var(--radius)] shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Neue Spalte</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. In Bearbeitung"
              className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Farbe
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          {/* WIP Limit */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              WIP-Limit (optional)
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="z.B. 5"
              min="1"
              className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Maximale Anzahl an Aufgaben in dieser Spalte
            </p>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-[var(--radius)] gradient-main text-white
                disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
