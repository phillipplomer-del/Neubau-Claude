/**
 * Project Report Panel
 * Displays AI-generated project analysis with structured sections
 */

import { X, CheckCircle, AlertTriangle, Lightbulb, FileText, Loader2, Sparkles } from 'lucide-react';
import type { ProjectReport } from '@/lib/ai/geminiService';

interface ProjectReportPanelProps {
  report: ProjectReport | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  projektInfo?: {
    projektnummer: string;
    projektname: string;
    kalenderwoche: string;
  };
}

export default function ProjectReportPanel({
  report,
  loading,
  error,
  onClose,
  projektInfo,
}: ProjectReportPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">KI-Projektbericht</h2>
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
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Analysiere Projektdaten...</p>
              <p className="text-xs text-muted-foreground/70">Gemini 3 Flash generiert den Bericht</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-red-500 font-medium">Fehler bei der Berichterstellung</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
            </div>
          )}

          {report && !loading && (
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
