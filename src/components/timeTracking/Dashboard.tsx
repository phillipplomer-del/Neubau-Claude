/**
 * Time Tracking Dashboard
 * Main page for time tracking with timer and simple entry list
 */

import { useState, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  X,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useProjectNumbers } from '@/hooks/useProjectNumbers';
import { useUserContext } from '@/contexts/UserContext';
import {
  formatDuration,
  CATEGORY_INFO,
  type TimeEntryCategory,
} from '@/types/timeTracking';

export default function TimeTrackingDashboard() {
  const { user } = useUserContext();
  const {
    activeTimer,
    isTimerRunning,
    elapsedSeconds,
    entries,
    start,
    stop,
    discard,
    createEntry,
    deleteEntry,
    weekTotal,
    todayTotal,
  } = useTimeTracking();

  const { suggestions: projectSuggestions } = useProjectNumbers();

  // State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TimeEntryCategory>('other');
  const [description, setDescription] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('10:00');
  const [projectSearch, setProjectSearch] = useState('');

  // Format elapsed time for display
  const elapsedDisplay = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Filter projects for search
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projectSuggestions.slice(0, 10);
    const term = projectSearch.toLowerCase();
    return projectSuggestions
      .filter(
        (p) =>
          p.projektnummer.toLowerCase().includes(term) ||
          p.projectName?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [projectSuggestions, projectSearch]);

  // Handle timer start
  const handleStartTimer = async (projektnummer: string, projectName?: string) => {
    console.log('[Dashboard] Starting timer for:', projektnummer);
    try {
      await start(projektnummer, projectName, selectedCategory);
      setSelectedProject('');
      setProjectSearch('');
    } catch (err) {
      console.error('[Dashboard] Error starting timer:', err);
    }
  };

  // Handle timer stop
  const handleStopTimer = async () => {
    await stop(description || undefined, selectedCategory);
    setDescription('');
  };

  // Handle manual entry
  const handleManualEntry = async () => {
    if (!selectedProject) return;

    const startDateTime = new Date(`${manualDate}T${manualStartTime}`);
    const endDateTime = new Date(`${manualDate}T${manualEndTime}`);

    if (endDateTime <= startDateTime) {
      alert('Endzeit muss nach Startzeit liegen');
      return;
    }

    const project = projectSuggestions.find((p) => p.projektnummer === selectedProject);

    await createEntry({
      projektnummer: selectedProject,
      projectName: project?.projectName,
      startTime: startDateTime,
      endTime: endDateTime,
      description: description || undefined,
      category: selectedCategory,
      billable: true,
    });

    setShowManualEntry(false);
    setSelectedProject('');
    setDescription('');
    setProjectSearch('');
  };

  // Format date for display
  const formatEntryDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Format time range
  const formatTimeRange = (start: Date, end: Date) => {
    const startTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };

  // Export to PDF
  const exportToPDF = () => {
    if (entries.length === 0) {
      alert('Keine Einträge zum Exportieren vorhanden');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Primary color
    doc.text('Zeiterfassung', 14, 20);

    // Subtitle with user and date range
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const dateRange = entries.length > 0
      ? `${entries[entries.length - 1].startTime.toDate().toLocaleDateString('de-DE')} - ${entries[0].startTime.toDate().toLocaleDateString('de-DE')}`
      : '';
    doc.text(`${user?.fullName || 'Benutzer'} | ${dateRange}`, 14, 28);

    // Summary box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 34, pageWidth - 28, 20, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Gesamtzeit: ${formatDuration(weekTotal)}`, 20, 46);
    doc.text(`Einträge: ${entries.length}`, pageWidth / 2, 46);

    // Table data
    const tableData = entries.map((entry) => [
      entry.startTime.toDate().toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      }),
      `${entry.startTime.toDate().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} - ${entry.endTime?.toDate().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) || ''}`,
      entry.projektnummer,
      entry.projectName || '-',
      CATEGORY_INFO[entry.category].label,
      entry.description || '-',
      formatDuration(entry.duration),
    ]);

    // Generate table
    autoTable(doc, {
      startY: 60,
      head: [['Datum', 'Zeit', 'Projekt-Nr.', 'Projektname', 'Kategorie', 'Beschreibung', 'Dauer']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 40 },
        6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 14, right: 14 },
    });

    // Footer with total
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(14, finalY + 5, pageWidth - 28, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Gesamtsumme:', 20, finalY + 13);
    doc.text(formatDuration(weekTotal), pageWidth - 20, finalY + 13, { align: 'right' });

    // Generated timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );

    // Save the PDF
    const fileName = `Zeiterfassung_${user?.fullName?.replace(/\s+/g, '_') || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold gradient-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Zeiterfassung
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Erfasse deine Arbeitszeit pro Projekt
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToPDF}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-card text-foreground hover:bg-card-muted transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-4 w-4" />
            PDF Export
          </button>
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-chip)] gradient-main text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Manueller Eintrag
          </button>
        </div>
      </div>

      {/* Timer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Timer / Start Timer */}
        <div className="lg:col-span-2 rounded-[var(--radius-card)] border border-border/50 bg-card p-6">
          {isTimerRunning ? (
            // Active timer display
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                    <span className="relative flex h-3 w-3 rounded-full bg-red-500"></span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Timer läuft</span>
                </div>
                <span
                  className="text-4xl font-mono font-bold text-red-500"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {elapsedDisplay}
                </span>
              </div>

              <div className="p-4 rounded-[var(--radius-chip)] bg-card-muted">
                <div className="text-lg font-semibold">
                  {activeTimer?.projektnummer}
                </div>
                {activeTimer?.projectName && (
                  <div className="text-sm text-muted-foreground">{activeTimer.projectName}</div>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Was hast du gemacht? (optional)"
                  className="w-full px-4 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleStopTimer}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-chip)] bg-red-500 text-white hover:bg-red-600 transition-all"
                  >
                    <Square className="h-5 w-5" />
                    Timer stoppen
                  </button>
                  <button
                    onClick={discard}
                    className="px-4 py-3 rounded-[var(--radius-chip)] text-muted-foreground hover:text-foreground hover:bg-card-muted transition-all"
                    title="Timer verwerfen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Start timer section
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-lg font-medium">Neuen Timer starten</span>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectSearch) {
                      const firstMatch = filteredProjects[0];
                      if (firstMatch) {
                        handleStartTimer(firstMatch.projektnummer, firstMatch.projectName);
                      } else {
                        handleStartTimer(projectSearch);
                      }
                    }
                  }}
                  placeholder="Projektnummer eingeben oder suchen..."
                  className="w-full px-4 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                {/* Category selector */}
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_INFO) as TimeEntryCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-sm rounded-full border transition-all ${
                        selectedCategory === cat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {CATEGORY_INFO[cat].label}
                    </button>
                  ))}
                </div>

                {/* Project list */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <button
                        key={project.projektnummer}
                        onClick={() => handleStartTimer(project.projektnummer, project.projectName)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-[var(--radius-chip)] hover:bg-card-muted transition-all group"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{project.projektnummer}</div>
                          {project.projectName && (
                            <div className="text-sm text-muted-foreground truncate">
                              {project.projectName}
                            </div>
                          )}
                        </div>
                        <Play className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    ))
                  ) : projectSearch ? (
                    <button
                      onClick={() => handleStartTimer(projectSearch)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-[var(--radius-chip)] hover:bg-card-muted transition-all group"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">"{projectSearch}" starten</div>
                        <div className="text-sm text-muted-foreground">
                          Als neue Projektnummer verwenden
                        </div>
                      </div>
                      <Play className="h-5 w-5 text-primary flex-shrink-0" />
                    </button>
                  ) : (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Projekte importiert</p>
                      <p className="text-xs mt-1">Gib eine Projektnummer ein und drücke Enter</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-border/50 bg-card p-4">
            <div className="text-sm text-muted-foreground mb-1">Heute</div>
            <div className="text-2xl font-bold">{formatDuration(todayTotal)}</div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border/50 bg-card p-4">
            <div className="text-sm text-muted-foreground mb-1">Diese Woche</div>
            <div className="text-2xl font-bold">{formatDuration(weekTotal)}</div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border/50 bg-card p-4">
            <div className="text-sm text-muted-foreground mb-1">Einträge</div>
            <div className="text-2xl font-bold">{entries.length}</div>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="rounded-[var(--radius-card)] border border-border/50 bg-card">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">Zeiteinträge</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Zeiteinträge</p>
            <p className="text-sm mt-1">Starte einen Timer oder erstelle einen manuellen Eintrag</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 p-4 hover:bg-card-muted/50 transition-all group"
              >
                {/* Category color indicator */}
                <div
                  className="w-1 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_INFO[entry.category].color }}
                />

                {/* Date */}
                <div className="w-24 flex-shrink-0">
                  <div className="text-sm font-medium">
                    {formatEntryDate(entry.startTime.toDate())}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeRange(entry.startTime.toDate(), entry.endTime?.toDate() || new Date())}
                  </div>
                </div>

                {/* Project & Description */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{entry.projektnummer}</div>
                  {entry.projectName && (
                    <div className="text-sm text-muted-foreground truncate">{entry.projectName}</div>
                  )}
                  {entry.description && (
                    <div className="text-sm text-muted-foreground truncate mt-1">{entry.description}</div>
                  )}
                </div>

                {/* Category Badge */}
                <div
                  className="px-2 py-1 text-xs rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: `${CATEGORY_INFO[entry.category].color}20`,
                    color: CATEGORY_INFO[entry.category].color,
                  }}
                >
                  {CATEGORY_INFO[entry.category].label}
                </div>

                {/* Duration */}
                <div className="w-20 text-right flex-shrink-0">
                  <div className="font-mono font-semibold">{formatDuration(entry.duration)}</div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => {
                    if (confirm('Eintrag löschen?')) {
                      deleteEntry(entry.id);
                    }
                  }}
                  className="p-2 rounded-[var(--radius-chip)] opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowManualEntry(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50">
            <div className="rounded-[var(--radius-card)] border border-border/50 bg-card shadow-lg">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold">Manueller Zeiteintrag</h2>
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="p-1 rounded hover:bg-card-muted transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Project Search */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Projekt *
                  </label>
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setSelectedProject(e.target.value);
                    }}
                    placeholder="Projektnummer eingeben..."
                    className="w-full px-3 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {projectSearch && filteredProjects.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto border border-border/50 rounded-[var(--radius-chip)]">
                      {filteredProjects.map((p) => (
                        <button
                          key={p.projektnummer}
                          onClick={() => {
                            setSelectedProject(p.projektnummer);
                            setProjectSearch(p.projektnummer);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-card-muted"
                        >
                          {p.projektnummer}
                          {p.projectName && (
                            <span className="text-muted-foreground ml-2">- {p.projectName}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Von
                    </label>
                    <input
                      type="time"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Bis
                    </label>
                    <input
                      type="time"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Kategorie
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CATEGORY_INFO) as TimeEntryCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 text-sm rounded-full border transition-all ${
                          selectedCategory === cat
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {CATEGORY_INFO[cat].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Was hast du gemacht?"
                    className="w-full px-3 py-2 rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-border/50">
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="px-4 py-2 rounded-[var(--radius-chip)] text-muted-foreground hover:bg-card-muted transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleManualEntry}
                  disabled={!selectedProject}
                  className="px-4 py-2 rounded-[var(--radius-chip)] gradient-main text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
