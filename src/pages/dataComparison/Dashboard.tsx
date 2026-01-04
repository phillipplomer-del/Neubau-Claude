/**
 * Data Comparison Dashboard
 * Shows matches of Projektnummern across Sales, Production, and Controlling
 */

import { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useDataComparison, type MatchResult } from '@/hooks/useDataComparison';
import { RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

type MatchCategory = 'allThree' | 'salesProduction' | 'salesControlling' | 'productionControlling' | 'salesNotInControlling';

interface MatchSectionProps {
  title: string;
  description: string;
  matches: MatchResult[];
  expanded: boolean;
  onToggle: () => void;
  color: string;
}

function MatchSection({ title, description, matches, expanded, onToggle, color }: MatchSectionProps) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            <div>
              <CardTitle className="flex items-center gap-2">
                {title}
                <span className={`text-lg font-bold ${color}`}>({matches.length})</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Keine Matches gefunden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium">Projektnummer</th>
                    <th className="text-right py-2 px-3 font-medium">Sales</th>
                    <th className="text-right py-2 px-3 font-medium">Produktion</th>
                    <th className="text-right py-2 px-3 font-medium">Controlling</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.projektnummer} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono font-medium">{match.projektnummer}</td>
                      <td className="py-2 px-3 text-right">
                        {match.salesCount > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400">{match.salesCount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {match.productionCount > 0 ? (
                          <span className="text-green-600 dark:text-green-400">{match.productionCount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {match.controllingCount > 0 ? (
                          <span className="text-purple-600 dark:text-purple-400">{match.controllingCount}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function DataComparisonDashboard() {
  const { loading, error, counts, matches, refresh } = useDataComparison();
  const [expandedSections, setExpandedSections] = useState<Set<MatchCategory>>(new Set(['allThree']));

  const toggleSection = (section: MatchCategory) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

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
            Vergleich der Projektnummern zwischen Sales, Produktion und Controlling
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
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{counts.uniquePnrSales}</div>
              <div className="text-sm text-muted-foreground mt-1">Projektnummern in Sales</div>
              <div className="text-xs text-muted-foreground">({counts.sales} Einträge)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{counts.uniquePnrProduction}</div>
              <div className="text-sm text-muted-foreground mt-1">Projektnummern in Produktion</div>
              <div className="text-xs text-muted-foreground">({counts.production} Einträge)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{counts.uniquePnrControlling}</div>
              <div className="text-sm text-muted-foreground mt-1">Projektnummern in Controlling</div>
              <div className="text-xs text-muted-foreground">({counts.controlling} Einträge)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Sections */}
      <div className="space-y-4">
        <MatchSection
          title="Matches: Sales + Produktion + Controlling"
          description="Projektnummern die in allen drei Bereichen vorkommen"
          matches={matches.allThree}
          expanded={expandedSections.has('allThree')}
          onToggle={() => toggleSection('allThree')}
          color="text-green-600 dark:text-green-400"
        />

        <MatchSection
          title="Matches: Sales + Produktion"
          description="Projektnummern in Sales und Produktion (nicht in Controlling)"
          matches={matches.salesProduction}
          expanded={expandedSections.has('salesProduction')}
          onToggle={() => toggleSection('salesProduction')}
          color="text-blue-600 dark:text-blue-400"
        />

        <MatchSection
          title="Matches: Sales + Controlling"
          description="Projektnummern in Sales und Controlling (nicht in Produktion)"
          matches={matches.salesControlling}
          expanded={expandedSections.has('salesControlling')}
          onToggle={() => toggleSection('salesControlling')}
          color="text-purple-600 dark:text-purple-400"
        />

        <MatchSection
          title="Matches: Produktion + Controlling"
          description="Projektnummern in Produktion und Controlling (inkl. Sales)"
          matches={matches.productionControlling}
          expanded={expandedSections.has('productionControlling')}
          onToggle={() => toggleSection('productionControlling')}
          color="text-orange-600 dark:text-orange-400"
        />

        <MatchSection
          title="In Sales, NICHT in Controlling"
          description="Projektnummern die in Sales sind aber nicht im Controlling erfasst"
          matches={matches.salesNotInControlling}
          expanded={expandedSections.has('salesNotInControlling')}
          onToggle={() => toggleSection('salesNotInControlling')}
          color="text-red-600 dark:text-red-400"
        />
      </div>
    </div>
  );
}
