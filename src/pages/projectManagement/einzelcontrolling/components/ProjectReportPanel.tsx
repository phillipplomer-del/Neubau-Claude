/**
 * Project Report Panel
 * Displays AI-generated project analysis with structured sections
 * Features: Data preview, Report generation, Export to text
 */

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Lightbulb, FileText, Loader2, Sparkles, Eye, Play, Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProjectReport, ProjectReportRequest } from '@/lib/ai/geminiService';

interface ProjectReportPanelProps {
  report: ProjectReport | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: () => void;
  requestData: ProjectReportRequest | null;
  projektInfo?: {
    projektnummer: string;
    projektname: string;
    kalenderwoche: string;
  };
}

type PanelMode = 'preview' | 'loading' | 'result' | 'error';

export default function ProjectReportPanel({
  report,
  loading,
  error,
  onClose,
  onGenerate,
  requestData,
  projektInfo,
}: ProjectReportPanelProps) {
  const [showFullData, setShowFullData] = useState(false);

  // Determine current mode
  const mode: PanelMode = loading ? 'loading' : error ? 'error' : report ? 'result' : 'preview';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const handleSaveReport = () => {
    if (!report || !projektInfo) return;

    const content = `KI-PROJEKTBERICHT
==================
Projekt: ${projektInfo.projektnummer} - ${projektInfo.projektname}
Stand: ${projektInfo.kalenderwoche}
Generiert: ${new Date(report.generatedAt).toLocaleString('de-DE')}

ZUSAMMENFASSUNG
---------------
${report.zusammenfassung}

STÄRKEN
-------
${report.staerken.map((s, i) => `${i + 1}. ${s}`).join('\n')}

RISIKEN
-------
${report.risiken.map((r, i) => `${i + 1}. ${r}`).join('\n')}

HANDLUNGSEMPFEHLUNGEN
---------------------
${report.handlungsempfehlungen.map((h, i) => `${i + 1}. ${h}`).join('\n')}

FAZIT
-----
${report.fazit}

---
Generiert mit Gemini 3 Flash
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KI-Bericht_${projektInfo.projektnummer}_${projektInfo.kalenderwoche.replace('/', '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {mode === 'preview' ? <Eye className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {mode === 'preview' ? 'Datenvorschau' : 'KI-Projektbericht'}
              </h2>
              {projektInfo && (
                <p className="text-sm text-muted-foreground">
                  {projektInfo.projektnummer} - {projektInfo.projektname} ({projektInfo.kalenderwoche})
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview Mode */}
          {mode === 'preview' && requestData && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Folgende Daten werden an Gemini 3 Flash zur Analyse übergeben:
              </p>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Auftragsvolumen</div>
                  <div className="font-semibold">{formatCurrency(requestData.controlling.auftragsvolumen)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Gesamtkosten</div>
                  <div className="font-semibold">{formatCurrency(requestData.controlling.gesamtkosten)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Deckungsbeitrag</div>
                  <div className="font-semibold">
                    {formatCurrency(requestData.controlling.deckungsbeitrag)} ({requestData.controlling.deckungsbeitragProzent.toFixed(1)}%)
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Fortschritt</div>
                  <div className="font-semibold">{requestData.controlling.fortschrittProzent.toFixed(0)}%</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Kostenabweichung</div>
                  <div className={`font-semibold ${requestData.controlling.kostenabweichungProzent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {requestData.controlling.kostenabweichungProzent >= 0 ? '+' : ''}{requestData.controlling.kostenabweichungProzent.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Stundenabweichung</div>
                  <div className={`font-semibold ${requestData.controlling.stundenabweichung > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {requestData.controlling.stundenabweichung >= 0 ? '+' : ''}{requestData.controlling.stundenabweichung.toFixed(0)} h
                  </div>
                </div>
              </div>

              {/* Top Kostenverursacher */}
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">Top Kostenverursacher</div>
                <div className="space-y-1">
                  {requestData.controlling.topKostenverursacher.slice(0, 5).map((k, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{k.bereich}</span>
                      <span className="font-medium">{formatCurrency(k.kosten)} ({k.anteilProzent.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Produktionsstruktur if available */}
              {requestData.produktionsstruktur && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-2">Produktionsstruktur</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>PAs: <span className="font-medium">{requestData.produktionsstruktur.anzahlPAs}</span></div>
                    <div>Arbeitsgänge: <span className="font-medium">{requestData.produktionsstruktur.anzahlArbeitsgaenge}</span></div>
                    <div>Stunden Plan: <span className="font-medium">{requestData.produktionsstruktur.stundenPlan.toFixed(0)} h</span></div>
                    <div>Stunden Ist: <span className="font-medium">{requestData.produktionsstruktur.stundenIst.toFixed(0)} h</span></div>
                  </div>
                  {requestData.produktionsstruktur.kritischePAs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs text-amber-500 mb-1">Kritische PAs (Stundenabweichung):</div>
                      {requestData.produktionsstruktur.kritischePAs.slice(0, 3).map((pa, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          {pa.paNummer}: {pa.abweichungProzent.toFixed(0)}% Abweichung
                        </div>
                      ))}
                    </div>
                  )}
                  {requestData.produktionsstruktur.verspaetetePAs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs text-red-500 mb-1">Verspätete PAs ({requestData.produktionsstruktur.verspaetetePAs.length}):</div>
                      {requestData.produktionsstruktur.verspaetetePAs.slice(0, 3).map((pa, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          {pa.paNummer}: {pa.tageVerspaetet} Tage verspätet (Fällig: {pa.endDatum})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Full JSON toggle */}
              <button
                onClick={() => setShowFullData(!showFullData)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showFullData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showFullData ? 'JSON ausblenden' : 'Vollständiges JSON anzeigen'}
              </button>

              {showFullData && (
                <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {JSON.stringify(requestData, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Loading Mode */}
          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Analysiere Projektdaten...</p>
              <p className="text-xs text-muted-foreground/70">Gemini 3 Flash generiert den Bericht</p>
            </div>
          )}

          {/* Error Mode */}
          {mode === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-red-500 font-medium">Fehler bei der Berichterstellung</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
            </div>
          )}

          {/* Result Mode */}
          {mode === 'result' && report && (
            <div className="space-y-6">
              {/* Zusammenfassung */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Zusammenfassung</h3>
                </div>
                <p className="text-foreground/90 leading-relaxed bg-muted/30 rounded-lg p-4">
                  {report.zusammenfassung}
                </p>
              </section>

              {/* Stärken */}
              {report.staerken.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold text-foreground">Stärken</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.staerken.map((staerke, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 bg-green-500/5 border border-green-500/20 rounded-lg p-3"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-foreground/90">{staerke}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Risiken */}
              {report.risiken.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-foreground">Risiken</h3>
                  </div>
                  <ul className="space-y-2">
                    {report.risiken.map((risiko, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-foreground/90">{risiko}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Handlungsempfehlungen */}
              {report.handlungsempfehlungen.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-foreground">Handlungsempfehlungen</h3>
                  </div>
                  <ol className="space-y-2">
                    {report.handlungsempfehlungen.map((empfehlung, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-foreground/90">{empfehlung}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Fazit */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Fazit</h3>
                </div>
                <p className="text-foreground/90 leading-relaxed bg-primary/5 border border-primary/20 rounded-lg p-4 font-medium">
                  {report.fazit}
                </p>
              </section>

              {/* Footer */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Generiert mit Gemini 3 Flash am{' '}
                  {new Date(report.generatedAt).toLocaleString('de-DE')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex justify-end gap-3">
            {mode === 'preview' && (
              <button
                onClick={onGenerate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4" />
                Bericht generieren
              </button>
            )}
            {mode === 'result' && (
              <button
                onClick={handleSaveReport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Als Textdatei speichern
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
