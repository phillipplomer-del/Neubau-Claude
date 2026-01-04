import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutDashboard, Kanban, List, GanttChart, Trash2, MoreVertical } from 'lucide-react';
import { usePlannerBoards } from '@/hooks/usePlannerBoards';
import { useUserContext } from '@/contexts/UserContext';
import CreateBoardModal from './components/CreateBoardModal';
import type { PMBoard, PMViewType } from '@/types/planner';

const VIEW_ICONS: Record<PMViewType, typeof Kanban> = {
  kanban: Kanban,
  list: List,
  gantt: GanttChart,
};

const VIEW_LABELS: Record<PMViewType, string> = {
  kanban: 'Kanban',
  list: 'Liste',
  gantt: 'Gantt',
};

export default function PlannerDashboard() {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const { boards, loading, error, deleteBoard } = usePlannerBoards();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Separate global and project-specific boards
  const globalBoards = boards.filter((b) => b.isGlobal);
  const projectBoards = boards.filter((b) => !b.isGlobal);

  const handleOpenBoard = (boardId: string) => {
    navigate(`/planner/${boardId}`);
  };

  const handleDeleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Board wirklich löschen? Alle Tasks und Spalten werden gelöscht.')) {
      setDeletingBoardId(boardId);
      try {
        await deleteBoard(boardId);
      } catch (err) {
        console.error('Error deleting board:', err);
      } finally {
        setDeletingBoardId(null);
        setOpenMenuId(null);
      }
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const BoardCard = ({ board }: { board: PMBoard }) => {
    const ViewIcon = VIEW_ICONS[board.defaultView];
    const isDeleting = deletingBoardId === board.id;

    return (
      <div
        onClick={() => handleOpenBoard(board.id)}
        className={`group relative bg-card border border-border rounded-[var(--radius)] p-4 cursor-pointer
          transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:bg-card/80
          ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">{board.name}</h3>
              {board.projektnummer && (
                <p className="text-xs text-muted-foreground">{board.projektnummer}</p>
              )}
            </div>
          </div>

          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === board.id ? null : board.id);
              }}
              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {openMenuId === board.id && (
              <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={(e) => handleDeleteBoard(board.id, e)}
                  className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {board.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{board.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ViewIcon className="h-3.5 w-3.5" />
            <span>{VIEW_LABELS[board.defaultView]}</span>
          </div>
          <span>Aktualisiert: {formatDate(board.updatedAt)}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">Fehler beim Laden der Boards</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" onClick={() => setOpenMenuId(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planner</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Projekte mit Kanban, Listen oder Gantt-Ansicht
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] gradient-main text-white font-medium shadow-[var(--shadow-chip)] hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" />
          Neues Board
        </button>
      </div>

      {/* Global Boards */}
      {globalBoards.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Allgemeine Boards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      {/* Project Boards */}
      {projectBoards.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Kanban className="h-5 w-5 text-primary" />
            Projekt-Boards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {boards.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-[var(--radius)]">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Keine Boards vorhanden</h3>
          <p className="text-muted-foreground mb-4">
            Erstellen Sie Ihr erstes Board, um Ihre Aufgaben zu organisieren.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] gradient-main text-white font-medium"
          >
            <Plus className="h-5 w-5" />
            Board erstellen
          </button>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          userName={user?.name || 'Unbekannt'}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
