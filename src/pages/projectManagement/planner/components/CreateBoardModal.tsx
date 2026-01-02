import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Kanban, List, GanttChart } from 'lucide-react';
import { usePlannerBoards } from '@/hooks/usePlannerBoards';
import type { PMViewType } from '@/types/planner';

interface CreateBoardModalProps {
  userName: string;
  onClose: () => void;
  projektnummer?: string;
}

const VIEW_OPTIONS: { value: PMViewType; label: string; icon: typeof Kanban }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'list', label: 'Liste', icon: List },
  { value: 'gantt', label: 'Gantt', icon: GanttChart },
];

export default function CreateBoardModal({ userName, onClose, projektnummer }: CreateBoardModalProps) {
  const navigate = useNavigate();
  const { createBoard } = usePlannerBoards();
  const [name, setName] = useState(projektnummer ? `Board ${projektnummer}` : '');
  const [description, setDescription] = useState('');
  const [selectedView, setSelectedView] = useState<PMViewType>('kanban');
  const [boardType, setBoardType] = useState<'global' | 'project'>(projektnummer ? 'project' : 'global');
  const [projectNumber, setProjectNumber] = useState(projektnummer || '');
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
      const boardId = await createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
        defaultView: selectedView,
        isGlobal: boardType === 'global',
        projektnummer: boardType === 'project' ? projectNumber.trim() || undefined : undefined,
        createdBy: userName,
      });

      navigate(`/planner/${boardId}`);
    } catch (err) {
      console.error('Error creating board:', err);
      setError('Fehler beim Erstellen des Boards');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-[var(--radius)] shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Neues Board erstellen</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Sprint 1, Projektplanung..."
              className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={2}
              className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Board Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Board-Typ
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBoardType('global')}
                className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius)] border transition-colors
                  ${boardType === 'global'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'}`}
              >
                Allgemein
              </button>
              <button
                type="button"
                onClick={() => setBoardType('project')}
                className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius)] border transition-colors
                  ${boardType === 'project'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'}`}
              >
                Projekt-spezifisch
              </button>
            </div>
          </div>

          {/* Project Number (only for project type) */}
          {boardType === 'project' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Projektnummer
              </label>
              <input
                type="text"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                placeholder="z.B. 12345"
                className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Projekt-Boards erhalten automatisch die Standard-Projektphasen
              </p>
            </div>
          )}

          {/* Default View */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Standard-Ansicht
            </label>
            <div className="flex gap-2">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedView(option.value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-[var(--radius)] border transition-colors
                      ${selectedView === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
