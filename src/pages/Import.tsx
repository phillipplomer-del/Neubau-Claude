/**
 * Import Page
 * Main page for importing Excel files from all three departments
 */

import { useState, useCallback } from 'react';
import type { Department, ImportResult } from '@/types/common';
import { useExcelImport } from '@/hooks/useExcelImport';
import { clearStore } from '@/lib/db';
import { STORE_NAMES } from '@/types/database';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MultiFileUploader from '@/components/import/MultiFileUploader';
import ImportProgress from '@/components/import/ImportProgress';
import { Upload, CheckCircle, XCircle, ArrowRight, Trash2 } from 'lucide-react';

type ImportStep = 'select' | 'uploading' | 'complete';

interface FileToImport {
  file: File;
  department: Department;
}

export default function Import() {
  const [step, setStep] = useState<ImportStep>('select');
  const [filesToImport, setFilesToImport] = useState<FileToImport[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [allResults, setAllResults] = useState<ImportResult[]>([]);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const { isImporting, progress, result, error, importFile, reset } = useExcelImport();

  const handleClearData = useCallback(async () => {
    if (!window.confirm('Möchten Sie alle importierten Daten löschen?\n\nKommentare und Markierungen bleiben erhalten.')) {
      return;
    }

    setClearing(true);
    setClearSuccess(false);

    try {
      await clearStore(STORE_NAMES.SALES);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      alert('Fehler beim Löschen der Daten');
    } finally {
      setClearing(false);
    }
  }, []);

  const handleFilesSelected = (files: FileToImport[]) => {
    setFilesToImport(files);
    setCurrentFileIndex(0);
    setAllResults([]);
    setStep('uploading');

    // Start importing files sequentially
    importNextFile(files, 0, []);
  };

  const importNextFile = async (
    files: FileToImport[],
    index: number,
    results: ImportResult[]
  ) => {
    if (index >= files.length) {
      setAllResults(results);
      setStep('complete');
      return;
    }

    setCurrentFileIndex(index);
    const fileToImport = files[index];
    if (!fileToImport) {
      importNextFile(files, index + 1, results);
      return;
    }

    try {
      await importFile(fileToImport.file, fileToImport.department);

      // Wait a bit for result to be set
      setTimeout(() => {
        if (result) {
          results.push(result);
        }
        importNextFile(files, index + 1, results);
      }, 100);
    } catch (err) {
      console.error('Import failed for file:', fileToImport.file.name, err);
      importNextFile(files, index + 1, results);
    }
  };

  const handleReset = () => {
    reset();
    setStep('select');
    setFilesToImport([]);
    setCurrentFileIndex(0);
    setAllResults([]);
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1
          className="text-[26px] font-bold text-foreground"
          style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}
        >
          Excel Import
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Laden Sie Excel-Dateien von Sales, Produktion und Projektmanagement hoch
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-[var(--danger)]/30 bg-[var(--danger)]/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--danger)]/20">
                <XCircle className="h-5 w-5 text-[var(--danger)]" />
              </div>
              <div className="flex-1">
                <h3
                  className="font-semibold text-[var(--danger)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Import fehlgeschlagen
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Select Files */}
      {step === 'select' && <MultiFileUploader onFilesSelected={handleFilesSelected} />}

      {/* Step: Uploading */}
      {step === 'uploading' && progress && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Dateien werden importiert ({currentFileIndex + 1} von {filesToImport.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current File Info */}
                {filesToImport[currentFileIndex] && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-8 h-8 rounded-lg gradient-card-1 flex items-center justify-center">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-foreground">{filesToImport[currentFileIndex].file.name}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>
                      {((filesToImport[currentFileIndex].file.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}

                <ImportProgress progress={progress} />

                {/* Progress Overview */}
                <div className="flex items-center gap-2 pt-4">
                  {filesToImport.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        index < currentFileIndex
                          ? 'gradient-main'
                          : index === currentFileIndex
                          ? 'bg-primary animate-pulse'
                          : 'bg-card-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (allResults.length > 0 || result) && (
        <div className="space-y-6">
          {/* Success Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Import abgeschlossen - {allResults.length || 1}{' '}
                  {allResults.length === 1 || (!allResults.length && result) ? 'Datei' : 'Dateien'}
                </CardTitle>
                <Button onClick={handleReset}>Weiteren Import starten</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Individual File Results */}
                {(allResults.length > 0 ? allResults : result ? [result] : []).map((res, index) => (
                  <div
                    key={index}
                    className="rounded-[var(--radius-card)] bg-card-muted p-5"
                  >
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-xl gradient-main flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p
                            className="font-semibold text-foreground"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {res.fileName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {res.department === 'sales'
                              ? 'Sales (Offene Lieferungen)'
                              : res.department === 'production'
                              ? 'Produktion (Soll-Ist)'
                              : 'Controlling'}{' '}
                            •{' '}
                            {res.rowsImported.toLocaleString('de-DE')} Zeilen in{' '}
                            {(res.duration / 1000).toFixed(1)}s
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-[var(--radius-chip)] bg-card">
                          <div
                            className="text-xl font-bold gradient-text"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {res.rowsImported.toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs text-muted-foreground">Zeilen</div>
                        </div>
                        <div className="text-center p-3 rounded-[var(--radius-chip)] bg-card">
                          <div
                            className="text-xl font-bold text-[var(--success)]"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {res.validation.rowsValid.toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs text-muted-foreground">Gültig</div>
                        </div>
                        <div className="text-center p-3 rounded-[var(--radius-chip)] bg-card">
                          <div
                            className="text-xl font-bold text-muted-foreground"
                            style={{ fontFamily: 'var(--font-display)' }}
                          >
                            {(res.duration / 1000).toFixed(1)}s
                          </div>
                          <div className="text-xs text-muted-foreground">Dauer</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Stats */}
                {allResults.length > 1 && (
                  <div className="rounded-[var(--radius-card)] gradient-main p-5">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div
                          className="text-2xl font-bold text-white"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {allResults
                            .reduce((sum, r) => sum + r.rowsImported, 0)
                            .toLocaleString('de-DE')}
                        </div>
                        <div className="text-sm text-white/80">Gesamt Zeilen</div>
                      </div>
                      <div className="text-center">
                        <div
                          className="text-2xl font-bold text-white"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {allResults.length}
                        </div>
                        <div className="text-sm text-white/80">Dateien</div>
                      </div>
                      <div className="text-center">
                        <div
                          className="text-2xl font-bold text-white"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          {(allResults.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s
                        </div>
                        <div className="text-sm text-white/80">Gesamt Dauer</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card animate>
            <CardHeader>
              <CardTitle>Nächste Schritte</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Die Daten wurden erfolgreich importiert. Sie können jetzt:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => (window.location.href = '/sales')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Sales Dashboard
                </Button>
                <Button onClick={() => (window.location.href = '/production')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Produktion Dashboard
                </Button>
                <Button onClick={() => (window.location.href = '/projects')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Controlling Dashboard
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Weitere Dateien importieren
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Section: Info & Data Management */}
      {step === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Info Card */}
          <Card variant="muted">
            <CardHeader>
              <CardTitle>Hinweise zum Import</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full gradient-main mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Sales:</strong> Zeilen mit QuantityRem1 = 0 werden übersprungen
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full gradient-main mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Matching:</strong> Verknüpfung über Artikel- und Projektnummer
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full gradient-main mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Max. Dateigröße:</strong> Bis zu 20 MB pro Datei
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Management Card */}
          <Card variant="muted">
            <CardHeader>
              <CardTitle>Daten verwalten</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                Importierte Daten zurücksetzen. Kommentare und Markierungen bleiben erhalten.
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleClearData}
                  disabled={clearing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearing ? 'Lösche...' : 'Daten löschen'}
                </Button>
                {clearSuccess && (
                  <span className="text-sm text-[var(--success)] font-medium">
                    Erfolgreich gelöscht
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
