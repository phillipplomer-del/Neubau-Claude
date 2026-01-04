/**
 * Timer Widget - Compact timer display for the Header
 * Shows current timer status with quick controls
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, Clock, ChevronDown, X } from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useProjectNumbers } from '@/hooks/useProjectNumbers';
import { formatDuration, CATEGORY_INFO, type TimeEntryCategory } from '@/types/timeTracking';

export default function TimerWidget() {
  const navigate = useNavigate();
  const {
    activeTimer,
    isTimerRunning,
    elapsedSeconds,
    recentProjects,
    start,
    stop,
    discard,
  } = useTimeTracking();

  const { suggestions: projectSuggestions } = useProjectNumbers();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [description, setDescription] = useState('');

  // Format elapsed time
  const elapsedDisplay = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projectSuggestions.slice(0, 8);
    const term = searchTerm.toLowerCase();
    return projectSuggestions
      .filter(
        (p) =>
          p.projektnummer.toLowerCase().includes(term) ||
          p.projectName?.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [projectSuggestions, searchTerm]);

  // Handle quick start
  const handleQuickStart = async (projektnummer: string, projectName?: string) => {
    await start(projektnummer, projectName, 'other');
    setShowQuickStart(false);
    setSearchTerm('');
  };

  // Handle stop
  const handleStop = async () => {
    await stop(description || undefined);
    setDescription('');
    setShowDropdown(false);
  };

  // Handle discard
  const handleDiscard = async () => {
    await discard();
    setDescription('');
    setShowDropdown(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.timer-widget')) {
        setShowDropdown(false);
        setShowQuickStart(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="timer-widget relative flex items-center gap-2">
      {isTimerRunning ? (
        // Timer running - show timer display
        <>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all duration-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-mono text-sm font-medium">{elapsedDisplay}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {/* Timer dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-card)] border border-border/50 bg-card shadow-[var(--shadow-hover)] z-50 overflow-hidden">
              <div className="p-3 border-b border-border/50 bg-card-muted">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Aktiver Timer</span>
                  <span className="text-lg font-mono font-bold text-red-500">
                    {elapsedDisplay}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">
                  {activeTimer?.projektnummer}
                  {activeTimer?.projectName && (
                    <span className="text-muted-foreground ml-1">
                      - {activeTimer.projectName}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Beschreibung (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Was hast du gemacht?"
                    className="w-full px-3 py-2 text-sm rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStop}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-chip)] bg-red-500 text-white hover:bg-red-600 transition-all duration-300"
                  >
                    <Square className="h-4 w-4" />
                    Stoppen
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="px-3 py-2 rounded-[var(--radius-chip)] text-muted-foreground hover:text-foreground hover:bg-card-muted transition-all duration-300"
                    title="Timer verwerfen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-3 py-2 border-t border-border/50 bg-card-muted">
                <button
                  onClick={() => {
                    navigate('/time-tracking');
                    setShowDropdown(false);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Zur Zeiterfassung
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // No timer running - show start button
        <>
          <button
            onClick={() => setShowQuickStart(!showQuickStart)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300"
            title="Timer starten"
          >
            <Play className="h-4 w-4" />
            <span className="text-sm font-medium hidden sm:inline">Zeit erfassen</span>
          </button>

          {/* Quick start dropdown */}
          {showQuickStart && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-[var(--radius-card)] border border-border/50 bg-card shadow-[var(--shadow-hover)] z-50 overflow-hidden">
              <div className="p-3 border-b border-border/50">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm) {
                      // Start with first match or manual entry
                      const firstMatch = filteredProjects[0];
                      if (firstMatch) {
                        handleQuickStart(firstMatch.projektnummer, firstMatch.projectName);
                      } else {
                        handleQuickStart(searchTerm);
                      }
                    }
                  }}
                  placeholder="Projektnummer eingeben..."
                  className="w-full px-3 py-2 text-sm rounded-[var(--radius-chip)] border border-border/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {/* Recent projects */}
                {!searchTerm && recentProjects.length > 0 && (
                  <div className="p-2 border-b border-border/50">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Zuletzt verwendet
                    </div>
                    {recentProjects.map((project) => (
                      <button
                        key={project.projektnummer}
                        onClick={() => handleQuickStart(project.projektnummer, project.projectName)}
                        className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-[var(--radius-chip)] hover:bg-card-muted transition-all duration-200"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {project.projektnummer}
                          </div>
                          {project.projectName && (
                            <div className="text-xs text-muted-foreground truncate">
                              {project.projectName}
                            </div>
                          )}
                        </div>
                        <Play className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Search results / All projects */}
                <div className="p-2">
                  {searchTerm && (
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Suchergebnisse
                    </div>
                  )}
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <button
                        key={project.projektnummer}
                        onClick={() => handleQuickStart(project.projektnummer, project.projectName)}
                        className="w-full flex items-center gap-2 px-2 py-2 text-left rounded-[var(--radius-chip)] hover:bg-card-muted transition-all duration-200 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {project.projektnummer}
                          </div>
                          {project.projectName && (
                            <div className="text-xs text-muted-foreground truncate">
                              {project.projectName}
                            </div>
                          )}
                        </div>
                        <Play className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  ) : searchTerm ? (
                    // Allow manual entry if no match found
                    <button
                      onClick={() => handleQuickStart(searchTerm)}
                      className="w-full flex items-center gap-2 px-2 py-3 text-left rounded-[var(--radius-chip)] hover:bg-card-muted transition-all duration-200 group"
                    >
                      <Play className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          "{searchTerm}" starten
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Als neue Projektnummer verwenden
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Keine Projekte importiert - Projektnummer eingeben
                    </div>
                  )}
                </div>
              </div>

              <div className="px-3 py-2 border-t border-border/50 bg-card-muted">
                <button
                  onClick={() => {
                    navigate('/time-tracking');
                    setShowQuickStart(false);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Zur Zeiterfassung
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
