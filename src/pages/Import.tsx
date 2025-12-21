/**
 * Import Page
 * Main page for importing Excel files from all three departments
 */

import { useState } from 'react';
import type { Department, ImportResult } from '@/types/common';
import { useExcelImport } from '@/hooks/useExcelImport';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MultiFileUploader from '@/components/import/MultiFileUploader';
import ImportProgress from '@/components/import/ImportProgress';
import ValidationResults from '@/components/import/ValidationResults';

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

  const { isImporting, progress, result, error, importFile, reset } = useExcelImport();

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Excel Import</h1>
        <p className="mt-2 text-gray-600">
          Laden Sie Excel-Dateien von Sales, Produktion und Projektmanagement hoch
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-xl">
              ❌
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Import fehlgeschlagen</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Erneut versuchen
            </Button>
          </div>
        </div>
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
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>📄</span>
                    <span className="font-medium">{filesToImport[currentFileIndex].file.name}</span>
                    <span className="text-gray-400">•</span>
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
                      className={`h-2 flex-1 rounded-full ${
                        index < currentFileIndex
                          ? 'bg-green-500'
                          : index === currentFileIndex
                          ? 'bg-primary-500 animate-pulse'
                          : 'bg-gray-200'
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
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-2xl">✅</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{res.fileName}</p>
                          <p className="text-gray-600">
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
                        <div className="text-center">
                          <div className="text-xl font-bold text-primary-600">
                            {res.rowsImported.toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs text-gray-600">Zeilen</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {res.validation.rowsValid.toLocaleString('de-DE')}
                          </div>
                          <div className="text-xs text-gray-600">Gültig</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-600">
                            {(res.duration / 1000).toFixed(1)}s
                          </div>
                          <div className="text-xs text-gray-600">Dauer</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Stats */}
                {allResults.length > 1 && (
                  <div className="rounded-lg bg-primary-50 border border-primary-200 p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {allResults
                            .reduce((sum, r) => sum + r.rowsImported, 0)
                            .toLocaleString('de-DE')}
                        </div>
                        <div className="text-sm text-gray-600">Gesamt Zeilen</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {allResults.length}
                        </div>
                        <div className="text-sm text-gray-600">Dateien</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {(allResults.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-600">Gesamt Dauer</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Nächste Schritte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Die Daten wurden erfolgreich importiert. Sie können jetzt:
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => (window.location.href = '/sales')}>
                    Sales Dashboard
                  </Button>
                  <Button onClick={() => (window.location.href = '/production')}>
                    Produktion Dashboard
                  </Button>
                  <Button onClick={() => (window.location.href = '/projects')}>
                    Controlling Dashboard
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Weitere Dateien importieren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      {step === 'select' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>ℹ️ Hinweise zum Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">•</span>
                <span>
                  <strong>Sales:</strong> Zeilen mit QuantityRem1 = 0 werden automatisch übersprungen (bereits geliefert)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">•</span>
                <span>
                  <strong>Matching:</strong> Einträge werden über Artikelnummer und Projektnummer verknüpft
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">•</span>
                <span>
                  <strong>Daten:</strong> Beim Import werden vorhandene Daten überschrieben
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0">•</span>
                <span>
                  <strong>Maximale Dateigröße:</strong> Bis zu 20 MB pro Datei
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
