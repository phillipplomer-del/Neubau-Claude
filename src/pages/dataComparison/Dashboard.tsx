/**
 * Data Comparison Dashboard
 * Compares data across Sales, Production, and Project Management
 */

import { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useDataComparison } from '@/hooks/useDataComparison';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

type ViewMode = 'projektnummern' | 'artikelnummern';
type ProjektFilter = 'all' | 'inAllThree' | 'inSalesAndProduction' | 'inSalesAndProject' | 'inProductionAndProject' | 'onlyInSales' | 'onlyInProduction' | 'onlyInProject';
type ArtikelFilter = 'all' | 'inBoth' | 'onlyInSales' | 'onlyInProduction';

export default function DataComparisonDashboard() {
  const { loading, error, counts, summary, projektnummernList, artikelnummernList, refresh } = useDataComparison();
  const [viewMode, setViewMode] = useState<ViewMode>('projektnummern');
  const [projektFilter, setProjektFilter] = useState<ProjektFilter>('all');
  const [artikelFilter, setArtikelFilter] = useState<ArtikelFilter>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Filter projektnummern based on selected filter
  const filteredProjektnummern = projektnummernList.filter((item) => {
    switch (projektFilter) {
      case 'inAllThree':
        return item.inSales && item.inProduction && item.inProjectManagement;
      case 'inSalesAndProduction':
        return item.inSales && item.inProduction && !item.inProjectManagement;
      case 'inSalesAndProject':
        return item.inSales && !item.inProduction && item.inProjectManagement;
      case 'inProductionAndProject':
        return !item.inSales && item.inProduction && item.inProjectManagement;
      case 'onlyInSales':
        return item.inSales && !item.inProduction && !item.inProjectManagement;
      case 'onlyInProduction':
        return !item.inSales && item.inProduction && !item.inProjectManagement;
      case 'onlyInProject':
        return !item.inSales && !item.inProduction && item.inProjectManagement;
      default:
        return true;
    }
  });

  // Filter artikelnummern based on selected filter
  const filteredArtikelnummern = artikelnummernList.filter((item) => {
    switch (artikelFilter) {
      case 'inBoth':
        return item.inSales && item.inProduction;
      case 'onlyInSales':
        return item.inSales && !item.inProduction;
      case 'onlyInProduction':
        return !item.inSales && item.inProduction;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Datenabgleich</h1>
          <p className="mt-1 text-muted-foreground">
            Vergleich der Daten aus Sales, Produktion und Projektmanagement
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Data Counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{counts.sales}</div>
              <div className="text-sm text-muted-foreground mt-1">Sales Einträge</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{counts.production}</div>
              <div className="text-sm text-muted-foreground mt-1">Produktions Einträge</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{counts.projectManagement}</div>
              <div className="text-sm text-muted-foreground mt-1">Projekt Einträge</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('summary')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {expandedSections.has('summary') ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              Zusammenfassung
            </CardTitle>
          </div>
        </CardHeader>
        {expandedSections.has('summary') && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Projektnummern Summary */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Projektnummern ({summary.projektnummern.total} gesamt)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">In allen drei Bereichen:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{summary.projektnummern.inAllThree}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sales + Produktion:</span>
                    <span className="font-medium">{summary.projektnummern.inSalesAndProduction}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sales + Projekt:</span>
                    <span className="font-medium">{summary.projektnummern.inSalesAndProject}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Produktion + Projekt:</span>
                    <span className="font-medium">{summary.projektnummern.inProductionAndProject}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nur in Sales:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{summary.projektnummern.onlyInSales}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nur in Produktion:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{summary.projektnummern.onlyInProduction}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nur in Projekt:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{summary.projektnummern.onlyInProject}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artikelnummern Summary */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Artikelnummern ({summary.artikelnummern.total} gesamt)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">In Sales und Produktion:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{summary.artikelnummern.inBoth}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nur in Sales:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{summary.artikelnummern.onlyInSales}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nur in Produktion:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{summary.artikelnummern.onlyInProduction}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'projektnummern' ? 'primary' : 'outline'}
          onClick={() => setViewMode('projektnummern')}
        >
          Projektnummern
        </Button>
        <Button
          variant={viewMode === 'artikelnummern' ? 'primary' : 'outline'}
          onClick={() => setViewMode('artikelnummern')}
        >
          Artikelnummern
        </Button>
      </div>

      {/* Detail View */}
      {viewMode === 'projektnummern' ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Projektnummern Vergleich</CardTitle>
              <select
                value={projektFilter}
                onChange={(e) => setProjektFilter(e.target.value as ProjektFilter)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">Alle ({projektnummernList.length})</option>
                <option value="inAllThree">In allen drei ({summary.projektnummern.inAllThree})</option>
                <option value="inSalesAndProduction">Sales + Produktion ({summary.projektnummern.inSalesAndProduction})</option>
                <option value="inSalesAndProject">Sales + Projekt ({summary.projektnummern.inSalesAndProject})</option>
                <option value="inProductionAndProject">Produktion + Projekt ({summary.projektnummern.inProductionAndProject})</option>
                <option value="onlyInSales">Nur Sales ({summary.projektnummern.onlyInSales})</option>
                <option value="onlyInProduction">Nur Produktion ({summary.projektnummern.onlyInProduction})</option>
                <option value="onlyInProject">Nur Projekt ({summary.projektnummern.onlyInProject})</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProjektnummern.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Projektnummern gefunden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium">Projektnummer</th>
                      <th className="text-center py-2 px-3 font-medium">Sales</th>
                      <th className="text-center py-2 px-3 font-medium">Produktion</th>
                      <th className="text-center py-2 px-3 font-medium">Projekt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjektnummern.slice(0, 100).map((item) => (
                      <tr key={item.projektnummer} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono">{item.projektnummer}</td>
                        <td className="py-2 px-3 text-center">
                          {item.inSales ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">({item.salesCount})</span>
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.inProduction ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">({item.productionCount})</span>
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.inProjectManagement ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">({item.projectCount})</span>
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProjektnummern.length > 100 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Zeige 100 von {filteredProjektnummern.length} Einträgen
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Artikelnummern Vergleich (Sales vs. Produktion)</CardTitle>
              <select
                value={artikelFilter}
                onChange={(e) => setArtikelFilter(e.target.value as ArtikelFilter)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">Alle ({artikelnummernList.length})</option>
                <option value="inBoth">In beiden ({summary.artikelnummern.inBoth})</option>
                <option value="onlyInSales">Nur Sales ({summary.artikelnummern.onlyInSales})</option>
                <option value="onlyInProduction">Nur Produktion ({summary.artikelnummern.onlyInProduction})</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredArtikelnummern.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Artikelnummern gefunden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium">Artikelnummer</th>
                      <th className="text-center py-2 px-3 font-medium">Sales</th>
                      <th className="text-center py-2 px-3 font-medium">Produktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtikelnummern.slice(0, 100).map((item) => (
                      <tr key={item.artikelnummer} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-3 font-mono">{item.artikelnummer}</td>
                        <td className="py-2 px-3 text-center">
                          {item.inSales ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">({item.salesCount})</span>
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.inProduction ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">({item.productionCount})</span>
                            </span>
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredArtikelnummern.length > 100 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Zeige 100 von {filteredArtikelnummern.length} Einträgen
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
