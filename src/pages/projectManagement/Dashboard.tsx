/**
 * Project Management Dashboard
 * Treemap visualization of all projects sized by Umsatz
 */

import { useState, useMemo } from 'react';
import { useControllingData } from '@/hooks/useControllingData';
import TreemapVisualization from './components/TreemapVisualization';
import Button from '@/components/ui/Button';
import { RefreshCw, AlertCircle } from 'lucide-react';

type CategoryFilter = 'all' | 'A' | 'B' | 'C';

export default function ProjectManagementDashboard() {
  const { projects, loading, error } = useControllingData();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Filter projects by category
  const filteredProjects = useMemo(() => {
    if (categoryFilter === 'all') return projects;
    return projects.filter(p => p.projektkategorie === categoryFilter);
  }, [projects, categoryFilter]);

  // Calculate summary stats for filtered projects
  const totalUmsatz = filteredProjects.reduce((sum, p) => sum + (p.umsatz || 0), 0);
  const totalMarge = filteredProjects.reduce((sum, p) => sum + (p.marge || 0), 0);
  const avgMargeProzent = totalUmsatz > 0 ? (totalMarge / totalUmsatz) * 100 : 0;

  // Count by category (always from all projects)
  const categoryA = projects.filter(p => p.projektkategorie === 'A').length;
  const categoryB = projects.filter(p => p.projektkategorie === 'B').length;
  const categoryC = projects.filter(p => p.projektkategorie === 'C').length;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Projekt-Übersicht</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-6">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Fehler beim Laden der Daten</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Projekt-Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredProjects.length} Projekte nach Umsatz
            {categoryFilter !== 'all' && ` (Kategorie ${categoryFilter})`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            {(['all', 'A', 'B', 'C'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  categoryFilter === cat
                    ? cat === 'A'
                      ? 'bg-green-500 text-white'
                      : cat === 'B'
                      ? 'bg-blue-500 text-white'
                      : cat === 'C'
                      ? 'bg-gray-500 text-white'
                      : 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {cat === 'all' ? 'Alle' : cat}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Treemap */}
      <TreemapVisualization projects={filteredProjects} loading={loading} />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Gesamt-Umsatz</div>
          <div className="text-lg font-semibold text-foreground">
            {new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalUmsatz)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Gesamt-Marge</div>
          <div className="text-lg font-semibold text-foreground">
            {new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: 'EUR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalMarge)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Avg. Marge %</div>
          <div className="text-lg font-semibold text-foreground">
            {avgMargeProzent.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Kategorien</div>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setCategoryFilter('A')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                categoryFilter === 'A'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
              }`}
            >
              A: {categoryA}
            </button>
            <button
              onClick={() => setCategoryFilter('B')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                categoryFilter === 'B'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              }`}
            >
              B: {categoryB}
            </button>
            <button
              onClick={() => setCategoryFilter('C')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                categoryFilter === 'C'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              C: {categoryC}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
