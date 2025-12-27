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
import Modal from '@/components/ui/Modal';
import { CheckCircle, ArrowRight, Trash2, Info, AlertTriangle, FileCheck } from 'lucide-react';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { isImporting, progress, result, error, importFile, reset } = useExcelImport();

  const handleClearDataClick = () => {
    setShowDeleteModal(true);
  };

  const confirmClearData = useCallback(async () => {
    setShowDeleteModal(false);
    setClearing(true);
    setClearSuccess(false);

    try {
      await Promise.all([
        clearStore(STORE_NAMES.SALES),
        clearStore(STORE_NAMES.PRODUCTION),
        clearStore(STORE_NAMES.PROJECT_MANAGEMENT),
        clearStore(STORE_NAMES.MATCHES),
        clearStore(STORE_NAMES.METADATA)
      ]);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);

      // Reset local state as well
      handleReset();
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
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 w-fit"
          style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}
        >
          Datenimport
        </h1>
        <p className="text-muted-foreground text-lg">
          Aktualisieren Sie Ihre Datenbanken durch den Upload aktueller Excel-Exports.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 animate-in slide-in-from-top-2">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-300" style={{ fontFamily: 'var(--font-display)' }}>
                  Import fehlgeschlagen
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="border-red-200 hover:bg-red-100 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-900/50">
                Erneut versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Select Files */}
      {step === 'select' && (
        <div className="animate-in fade-in duration-500">
          <MultiFileUploader onFilesSelected={handleFilesSelected} />
        </div>
      )}

      {/* Step: Uploading */}
      {step === 'uploading' && progress && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </div>
                Importiere Dateien ({currentFileIndex + 1} von {filesToImport.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {filesToImport[currentFileIndex] && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="h-12 w-12 rounded-lg bg-card flex items-center justify-center shadow-sm">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{filesToImport[currentFileIndex].file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {((filesToImport[currentFileIndex].file.size ?? 0) / 1024 / 1024).toFixed(2)} MB wird verarbeitet...
                    </p>
                  </div>
                </div>
              )}

              <ImportProgress progress={progress} />

              <div className="flex gap-1 h-1 bg-muted rounded-full overflow-hidden">
                {filesToImport.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 transition-all duration-500 ${index < currentFileIndex ? 'bg-primary' :
                      index === currentFileIndex ? 'bg-primary/50 animate-pulse' : 'bg-transparent'
                      }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (allResults.length > 0 || result) && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Success Banner */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900 overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-green-400/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            <CardHeader>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-green-900 dark:text-green-300">Import erfolgreich abgeschlossen</CardTitle>
                    <p className="text-green-700 dark:text-green-500 mt-1">
                      {allResults.length || 1} {allResults.length === 1 || (!allResults.length && result) ? 'Datei' : 'Dateien'} verarbeitet
                    </p>
                  </div>
                </div>
                <Button onClick={handleReset} variant="outline" className="bg-white/50 border-green-200 hover:bg-green-100 text-green-800 dark:bg-black/20 dark:border-green-800 dark:text-green-300">
                  Neuer Import
                </Button>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid gap-4 mt-2">
                {(allResults.length > 0 ? allResults : result ? [result] : []).map((res, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-green-100 dark:border-green-900/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${res.department === 'sales' ? 'bg-blue-500' :
                        res.department === 'production' ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                      <span className="font-medium">{res.fileName}</span>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span><strong className="text-foreground">{res.rowsImported.toLocaleString('de-DE')}</strong> Zeilen</span>
                      <span><strong className="text-green-600">{res.validation.rowsValid.toLocaleString('de-DE')}</strong> Gültig</span>
                      <span>{(res.duration / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="h-auto p-6 flex flex-col items-start gap-3 bg-card hover:bg-card-muted border border-border shadow-sm group transition-all hover:-translate-y-1"
              variant="outline"
              onClick={() => (window.location.href = '/sales')}
            >
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Zu Sales</h3>
                <p className="text-sm text-muted-foreground mt-1">Lieferungen prüfen</p>
              </div>
            </Button>

            <Button
              className="h-auto p-6 flex flex-col items-start gap-3 bg-card hover:bg-card-muted border border-border shadow-sm group transition-all hover:-translate-y-1"
              variant="outline"
              onClick={() => (window.location.href = '/production')}
            >
              <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Zu Produktion</h3>
                <p className="text-sm text-muted-foreground mt-1">Planung ansehen</p>
              </div>
            </Button>

            <Button
              className="h-auto p-6 flex flex-col items-start gap-3 bg-card hover:bg-card-muted border border-border shadow-sm group transition-all hover:-translate-y-1"
              variant="outline"
              onClick={() => (window.location.href = '/projects')}
            >
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Zum Controlling</h3>
                <p className="text-sm text-muted-foreground mt-1">Projekte auswerten</p>
              </div>
            </Button>
          </div>
        </div>
      )}

      {/* Info & Danger Zone */}
      {step === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border">
          {/* Info Card */}
          <div className="md:col-span-2 rounded-xl bg-card-muted/50 border border-border/50 p-6 flex gap-4">
            <Info className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="space-y-3">
              <h3 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Wichtige Hinweise</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Sales: Zeilen mit QuantityRem1 = 0 werden automatisch ignoriert.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Verknüpfung: Daten werden intelligent über Artikel- und Projektnummern verknüpft.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  Performance: Optimiert für Dateien bis zu 20MB.
                </li>
              </ul>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-100 bg-red-50/30 dark:border-red-900/30 p-6">
            <h3 className="font-semibold text-red-900 dark:text-red-400 flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              <Trash2 className="h-4 w-4" />
              Daten löschen
            </h3>
            <p className="text-xs text-red-700/70 dark:text-red-400/70 mb-4 leading-relaxed">
              Setzt alle importierten Daten zurück. Ihre Kommentare bleiben erhalten.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDataClick}
              disabled={clearing}
              className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-400"
            >
              {clearing ? 'Lösche...' : 'Datenbank bereinigen'}
            </Button>
            {clearSuccess && (
              <p className="text-xs text-green-600 font-medium mt-2 text-center animate-pulse">
                Erfolgreich gelöscht
              </p>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Datenbank bereinigen"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-300">
              <p className="font-semibold">Möchten Sie wirklich alle Daten löschen?</p>
              <p className="mt-1">
                Dieser Vorgang entfernt alle importierten Excel-Daten aus dem Browser-Speicher.
                Dies kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground px-1">
            Hinweis: Ihre persönlichen Markierungen und Kommentare bleiben erhalten.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={confirmClearData}
              autoFocus
            >
              Ja, alles löschen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
