import { useState } from 'react';
import { Upload, TrendingUp, TrendingDown, FileSpreadsheet, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { useEinzelcontrolling } from '@/hooks/useEinzelcontrolling';
import { useEinzelcontrollingImport } from '@/hooks/useEinzelcontrollingImport';
import { useUserContext } from '@/contexts/UserContext';
import type { EinzelcontrollingProject, EinzelcontrollingSnapshot } from '@/types/einzelcontrolling';
import { BEREICH_COLORS } from '@/types/einzelcontrolling';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function EinzelcontrollingView() {
  const { user } = useUserContext();
  const {
    projects,
    loading,
    error,
    selectedProject,
    snapshots,
    selectProject,
    deleteProject,
    deleteSnapshot,
  } = useEinzelcontrolling();

  const { importing, progress, error: importError, importFile, reset } = useEinzelcontrollingImport();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importFile(file, user?.name || 'Unbekannt');
    if (result.success) {
      // Refresh will happen via subscription
    }
    e.target.value = '';
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    setShowDeleteConfirm(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Einzelcontrolling</h1>
          <p className="text-muted-foreground">
            Projektbezogene Kostenanalyse und KPI-Tracking
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] gradient-main text-white font-medium shadow-[var(--shadow-chip)] hover:opacity-90 transition-opacity cursor-pointer">
          <Upload className="h-5 w-5" />
          Excel importieren
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>

      {/* Import Progress */}
      {importing && (
        <div className="bg-card border border-border rounded-[var(--radius)] p-4">
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium">Importiere Excel-Datei...</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Import Error */}
      {importError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-[var(--radius)] p-4 flex items-center justify-between">
          <span className="text-sm text-destructive">{importError}</span>
          <button onClick={reset} className="text-sm text-destructive hover:underline">
            Schließen
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Project List */}
        <div className="col-span-3">
          <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-sm">Projekte</h2>
            </div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {projects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Keine Projekte vorhanden. Importieren Sie eine Excel-Datei.
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      selectProject(project);
                      setSelectedSnapshotId(null);
                    }}
                    className={`px-4 py-3 cursor-pointer border-b border-border last:border-0 transition-colors
                      ${selectedProject?.id === project.id
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{project.projektnummer}</div>
                        {project.projektname && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {project.projektname}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(project.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {project.latestSnapshot && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Letzte KW: {project.latestSnapshot.kalenderwoche}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedProject && selectedSnapshot ? (
            <div className="space-y-6">
              {/* Snapshot Selector */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedSnapshotId || snapshots[0]?.id || ''}
                    onChange={(e) => setSelectedSnapshotId(e.target.value)}
                    className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {snapshot.kalenderwoche} - Import: {formatDate(snapshot.importedAt)}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-sm text-muted-foreground">
                  {snapshots.length} Snapshot{snapshots.length !== 1 ? 's' : ''} vorhanden
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-4">
                <KPICard
                  label="Auftragsvolumen"
                  value={formatCurrency(selectedSnapshot.uebersicht.auftragsvolumen)}
                  trend={null}
                />
                <KPICard
                  label="Gesamtkosten"
                  value={formatCurrency(selectedSnapshot.uebersicht.gesamtkosten)}
                  trend={selectedSnapshot.kpis.kostenabweichungProzent}
                  trendLabel="vs Plan"
                  invertTrend
                />
                <KPICard
                  label="Deckungsbeitrag"
                  value={formatCurrency(selectedSnapshot.uebersicht.deckungsbeitrag)}
                  trend={null}
                  subValue={`${selectedSnapshot.uebersicht.deckungsbeitragProzent.toFixed(1)}%`}
                />
                <KPICard
                  label="Fertigstellung"
                  value={`${selectedSnapshot.uebersicht.fortschrittProzent.toFixed(0)}%`}
                  trend={null}
                  progress={selectedSnapshot.uebersicht.fortschrittProzent}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-6">
                {/* Kostenverursacher Pie Chart */}
                <div className="bg-card border border-border rounded-[var(--radius)] p-4">
                  <h3 className="font-semibold mb-4">Kostenverteilung</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={selectedSnapshot.kpis.topKostenverursacher}
                          dataKey="kosten"
                          nameKey="bereich"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ bereich, anteilProzent }) =>
                            `${bereich}: ${anteilProzent.toFixed(0)}%`
                          }
                        >
                          {selectedSnapshot.kpis.topKostenverursacher.map((entry, index) => (
                            <Cell
                              key={entry.bereich}
                              fill={Object.values(BEREICH_COLORS)[index % 7]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Plan vs Ist Bar Chart */}
                <div className="bg-card border border-border rounded-[var(--radius)] p-4">
                  <h3 className="font-semibold mb-4">Plan vs. Ist</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Kosten',
                            Plan: selectedSnapshot.kpis.planKosten,
                            Ist: selectedSnapshot.kpis.istKosten,
                          },
                        ]}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="Plan" fill="#3B82F6" />
                        <Bar dataKey="Ist" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="grid grid-cols-3 gap-4">
                <DetailCard
                  title="Vorkalkulation"
                  items={[
                    { label: 'Material', value: selectedSnapshot.vorkalkulation.material },
                    { label: 'Fertigung', value: selectedSnapshot.vorkalkulation.fertigung },
                    { label: 'Montage', value: selectedSnapshot.vorkalkulation.montage },
                    { label: 'Konstruktion', value: selectedSnapshot.vorkalkulation.konstruktion },
                    { label: 'Gesamt', value: selectedSnapshot.vorkalkulation.gesamt, bold: true },
                  ]}
                />
                <DetailCard
                  title="Produktion"
                  items={[
                    { label: 'Stunden Fertigung', value: selectedSnapshot.produktion.stundenFertigung, unit: 'h' },
                    { label: 'Stunden Montage', value: selectedSnapshot.produktion.stundenMontage, unit: 'h' },
                    { label: 'Kosten Fertigung', value: selectedSnapshot.produktion.kostenFertigung },
                    { label: 'Kosten Montage', value: selectedSnapshot.produktion.kostenMontage },
                    { label: 'Gesamt', value: selectedSnapshot.produktion.gesamt, bold: true },
                  ]}
                />
                <DetailCard
                  title="Einkauf"
                  items={[
                    { label: 'Materialkosten', value: selectedSnapshot.einkauf.materialkosten },
                    { label: 'Zukaufteile', value: selectedSnapshot.einkauf.zukaufteile },
                    { label: 'Dienstleistungen', value: selectedSnapshot.einkauf.dienstleistungen },
                    { label: 'Gesamt', value: selectedSnapshot.einkauf.gesamt, bold: true },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Kein Projekt ausgewählt
              </h3>
              <p className="text-muted-foreground mb-4">
                Wählen Sie ein Projekt aus der Liste oder importieren Sie eine Excel-Datei.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-card border border-border rounded-[var(--radius)] shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Projekt löschen?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Alle Snapshots werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium border border-border rounded-[var(--radius)] hover:bg-muted"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-[var(--radius)] hover:opacity-90"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string;
  trend: number | null;
  trendLabel?: string;
  subValue?: string;
  invertTrend?: boolean;
  progress?: number;
}

function KPICard({ label, value, trend, trendLabel, subValue, invertTrend, progress }: KPICardProps) {
  const trendColor = trend !== null
    ? (invertTrend ? trend < 0 : trend >= 0)
      ? 'text-green-500'
      : 'text-red-500'
    : '';

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-sm text-muted-foreground mt-1">{subValue}</div>}
      {trend !== null && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${trendColor}`}>
          {(invertTrend ? trend < 0 : trend >= 0) ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% {trendLabel}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Detail Card Component
interface DetailCardProps {
  title: string;
  items: Array<{ label: string; value: number; unit?: string; bold?: boolean }>;
}

function DetailCard({ title, items }: DetailCardProps) {
  const formatValue = (value: number, unit?: string) => {
    if (unit === 'h') return `${value.toFixed(1)} h`;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex justify-between text-sm ${item.bold ? 'font-semibold border-t border-border pt-2 mt-2' : ''}`}
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span>{formatValue(item.value, item.unit)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
