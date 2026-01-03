import { useState, useEffect } from 'react';
import { X, Calendar, User, Flag, Tag, CheckSquare, Plus, Trash2, MessageSquare, Link2 } from 'lucide-react';
import type { PMTask, PMColumn, PMPriority, PMLabel, PMChecklistItem, PMTaskDependency, PMDependencyType, UpdateTaskInput } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS, DEFAULT_LABELS, DEPENDENCY_TYPE_LABELS } from '@/types/planner';

// Descriptions for dependency types
const DEPENDENCY_TYPE_DESCRIPTIONS: Record<PMDependencyType, string> = {
  FS: 'Task kann erst beginnen, wenn Vorgänger abgeschlossen ist',
  SS: 'Task kann beginnen, sobald Vorgänger begonnen hat',
  FF: 'Task kann erst enden, wenn Vorgänger abgeschlossen ist',
  SF: 'Task kann erst enden, wenn Vorgänger begonnen hat',
};
import { addTaskComment, subscribeToTaskComments, deleteTaskComment, type PMTaskComment } from '@/lib/firebase/plannerRepository';

interface TaskModalProps {
  task: PMTask | null;
  columns: PMColumn[];
  boardId: string;
  userName: string;
  allTasks?: PMTask[]; // For dependency selection
  onSave: (taskData: UpdateTaskInput & { columnId?: string; title?: string }) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onClose: () => void;
}

export default function TaskModal({
  task,
  columns,
  boardId,
  userName,
  allTasks = [],
  onSave,
  onDelete,
  onClose,
}: TaskModalProps) {
  const isNewTask = !task;
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [columnId, setColumnId] = useState(task?.columnId || columns[0]?.id || '');
  const [priority, setPriority] = useState<PMPriority>(task?.priority || 'medium');
  const [assignee, setAssignee] = useState(task?.assignee || '');
  const [startDate, setStartDate] = useState(
    task?.startDate ? task.startDate.toDate().toISOString().split('T')[0] : ''
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.toDate().toISOString().split('T')[0] : ''
  );
  const [labels, setLabels] = useState<PMLabel[]>(task?.labels || []);
  const [checklist, setChecklist] = useState<PMChecklistItem[]>(task?.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [comments, setComments] = useState<PMTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [dependencies, setDependencies] = useState<PMTaskDependency[]>(task?.dependencies || []);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'dependencies' | 'comments'>('details');

  // Load comments for existing task
  useEffect(() => {
    if (task?.id) {
      const unsubscribe = subscribeToTaskComments(
        task.id,
        (loadedComments) => setComments(loadedComments),
        (error) => console.error('Error loading comments:', error)
      );
      return () => unsubscribe();
    }
  }, [task?.id]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        columnId: isNewTask ? columnId : undefined,
        priority,
        assignee: assignee.trim() || undefined,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels,
        checklist,
        dependencies,
      });
      onClose(); // Close modal after successful save
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Dependency management
  const handleAddDependency = (predecessorId: string) => {
    if (dependencies.some(d => d.predecessorId === predecessorId)) return;
    setDependencies([
      ...dependencies,
      {
        predecessorId,
        type: 'FS', // Finish-to-Start is most common
        lagDays: 0,
      },
    ]);
  };

  const handleRemoveDependency = (predecessorId: string) => {
    setDependencies(dependencies.filter(d => d.predecessorId !== predecessorId));
  };

  const handleUpdateDependencyLag = (predecessorId: string, lagDays: number) => {
    setDependencies(
      dependencies.map(d =>
        d.predecessorId === predecessorId ? { ...d, lagDays } : d
      )
    );
  };

  const handleUpdateDependencyType = (predecessorId: string, type: PMDependencyType) => {
    setDependencies(
      dependencies.map(d =>
        d.predecessorId === predecessorId ? { ...d, type } : d
      )
    );
  };

  // Get available tasks for dependencies (exclude self and already added)
  const availableTasks = allTasks.filter(
    t => t.id !== task?.id && !dependencies.some(d => d.predecessorId === t.id && d.predecessorId !== t.code)
  );

  const handleDelete = async () => {
    if (task && confirm('Aufgabe wirklich löschen?')) {
      await onDelete(task.id);
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([
      ...checklist,
      {
        id: crypto.randomUUID(),
        text: newChecklistItem.trim(),
        completed: false,
      },
    ]);
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter((item) => item.id !== itemId));
  };

  const handleToggleLabel = (label: PMLabel) => {
    const exists = labels.some((l) => l.id === label.id);
    if (exists) {
      setLabels(labels.filter((l) => l.id !== label.id));
    } else {
      setLabels([...labels, label]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.id) return;
    try {
      await addTaskComment(task.id, userName, newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task?.id) return;
    try {
      await deleteTaskComment(task.id, commentId);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const formatCommentDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-[var(--radius)] shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isNewTask ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNewTask && (
              <button
                onClick={handleDelete}
                className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            Checkliste
            {checklist.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full">
                {checklist.filter((i) => i.completed).length}/{checklist.length}
              </span>
            )}
          </button>
          {allTasks.length > 0 && (
            <button
              onClick={() => setActiveTab('dependencies')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'dependencies'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="h-4 w-4" />
              Abhängigkeiten
              {dependencies.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full">{dependencies.length}</span>
              )}
            </button>
          )}
          {!isNewTask && (
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Kommentare
              {comments.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-muted rounded-full">{comments.length}</span>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Titel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Aufgabentitel"
                  className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optionale Beschreibung..."
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm resize-none
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Column (only for new tasks) */}
                {isNewTask && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Spalte</label>
                    <select
                      value={columnId}
                      onChange={(e) => setColumnId(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Flag className="h-4 w-4" /> Priorität
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PMPriority)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Bearbeiter
                  </label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="Name eingeben"
                    className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> Startdatum
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> Fälligkeitsdatum
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Tag className="h-4 w-4" /> Labels
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_LABELS.map((labelDef) => {
                    const isSelected = labels.some((l) => l.name === labelDef.name);
                    const label: PMLabel = {
                      id: labelDef.name.toLowerCase(),
                      name: labelDef.name,
                      color: labelDef.color,
                    };
                    return (
                      <button
                        key={labelDef.name}
                        type="button"
                        onClick={() => handleToggleLabel(label)}
                        className={`px-2.5 py-1 text-sm rounded-full border transition-all ${
                          isSelected
                            ? 'border-transparent'
                            : 'border-border hover:border-primary/30'
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${labelDef.color}20` : undefined,
                          color: isSelected ? labelDef.color : undefined,
                        }}
                      >
                        {labelDef.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-3">
              {/* Add Item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddChecklistItem();
                  }}
                  placeholder="Neuen Punkt hinzufügen..."
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] text-sm
                    disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted group"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {checklist.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Keine Checklistenpunkte vorhanden
                </p>
              )}
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              {/* Add Dependency */}
              <div>
                <label className="block text-sm font-medium mb-2">Vorgänger hinzufügen</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddDependency(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                  defaultValue=""
                >
                  <option value="" disabled>Task auswählen...</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code ? `[${t.code}] ` : ''}{t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dependencies List */}
              <div className="space-y-3">
                {dependencies.map((dep) => {
                  const predTask = allTasks.find(t => t.id === dep.predecessorId || t.code === dep.predecessorId);
                  return (
                    <div
                      key={dep.predecessorId}
                      className="p-3 bg-muted/50 rounded-lg border border-border/50"
                    >
                      {/* Header row with task name and delete button */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {predTask?.code ? `[${predTask.code}] ` : ''}{predTask?.title || dep.predecessorId}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dep.predecessorId)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Abhängigkeit entfernen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Settings row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {/* Dependency Type */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-muted-foreground">Typ:</label>
                          <select
                            value={dep.type}
                            onChange={(e) => handleUpdateDependencyType(dep.predecessorId, e.target.value as PMDependencyType)}
                            className="px-2 py-1 bg-input border border-border rounded text-xs"
                            title={DEPENDENCY_TYPE_DESCRIPTIONS[dep.type]}
                          >
                            {Object.entries(DEPENDENCY_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Lag/Lead Time */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-muted-foreground">
                            {dep.lagDays >= 0 ? 'Verzögerung:' : 'Vorlauf:'}
                          </label>
                          <input
                            type="number"
                            value={dep.lagDays}
                            onChange={(e) => handleUpdateDependencyLag(dep.predecessorId, parseInt(e.target.value) || 0)}
                            className="w-14 px-2 py-1 bg-input border border-border rounded text-xs text-center"
                            title="Positive Werte = Verzögerung, Negative = Vorlaufzeit"
                          />
                          <span className="text-muted-foreground">Tage</span>
                        </div>
                      </div>

                      {/* Type description */}
                      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                        {DEPENDENCY_TYPE_DESCRIPTIONS[dep.type]}
                      </p>
                    </div>
                  );
                })}
              </div>

              {dependencies.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Keine Abhängigkeiten definiert. Diese Aufgabe kann unabhängig beginnen.
                </p>
              )}

              {/* Legend */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs space-y-1.5">
                <p className="font-medium text-foreground mb-2">Abhängigkeitstypen:</p>
                <p><span className="font-medium">EA (Ende-Anfang):</span> Vorgänger muss enden, bevor diese Task beginnt</p>
                <p><span className="font-medium">AA (Anfang-Anfang):</span> Beide Tasks können gleichzeitig beginnen</p>
                <p><span className="font-medium">EE (Ende-Ende):</span> Beide Tasks müssen gleichzeitig enden</p>
                <p><span className="font-medium">AE (Anfang-Ende):</span> Vorgänger muss beginnen, bevor diese Task enden kann</p>
                <p className="mt-2 text-muted-foreground">
                  Negative Tage = Vorlaufzeit (Task kann früher starten)
                </p>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                  placeholder="Kommentar schreiben..."
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-[var(--radius)] text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] text-sm
                    disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  Senden
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-muted/50 rounded-lg group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{comment.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatCommentDate(comment.createdAt)}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground">{comment.text}</p>
                  </div>
                ))}
              </div>

              {comments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Keine Kommentare vorhanden
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="px-4 py-2 text-sm font-medium rounded-[var(--radius)] gradient-main text-white
              disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isSaving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
