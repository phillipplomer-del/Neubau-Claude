/**
 * Multi-File Uploader Component
 * Allows uploading all three Excel files at once with drag-and-drop
 */

import { useState, useCallback } from 'react';
import type { Department } from '@/types/common';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface FileWithDepartment {
  file: File;
  department: Department | null;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface MultiFileUploaderProps {
  onFilesSelected: (files: { file: File; department: Department }[]) => void;
}

export default function MultiFileUploader({ onFilesSelected }: MultiFileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithDepartment[]>([]);

  const detectDepartment = (fileName: string): Department | null => {
    const lower = fileName.toLowerCase();

    // Sales detection
    if (lower.includes('offene') || lower.includes('lieferung') || lower.includes('orderbacklog') || lower.includes('sales')) {
      return 'sales';
    }

    // Production detection
    if (lower.includes('produktion') || lower.includes('production') || lower.includes('soll') || lower.includes('ist')) {
      return 'production';
    }

    // Project Management detection
    if (lower.includes('controlling') || lower.includes('projekt')) {
      return 'projectManagement';
    }

    return null;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const excelFiles = fileArray.filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xlsm') || f.name.endsWith('.xls')
    );

    const filesWithDept: FileWithDepartment[] = excelFiles.map((file) => ({
      file,
      department: detectDepartment(file.name),
      status: 'pending' as const,
    }));

    setSelectedFiles(filesWithDept);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const updateDepartment = (index: number, department: Department) => {
    setSelectedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, department } : f))
    );
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    const validFiles = selectedFiles
      .filter((f) => f.department !== null)
      .map((f) => ({ file: f.file, department: f.department! }));

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const getDepartmentLabel = (dept: Department | null): string => {
    if (!dept) return 'Nicht erkannt';
    if (dept === 'sales') return 'Sales (Offene Lieferungen)';
    if (dept === 'production') return 'Produktion (Soll-Ist)';
    if (dept === 'projectManagement') return 'Projektmanagement (Controlling)';
    return dept;
  };

  const getDepartmentColor = (dept: Department | null): string => {
    if (!dept) return 'bg-gray-100 text-gray-700';
    if (dept === 'sales') return 'bg-blue-100 text-blue-700';
    if (dept === 'production') return 'bg-green-100 text-green-700';
    if (dept === 'projectManagement') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const allFilesHaveDepartment = selectedFiles.length > 0 && selectedFiles.every((f) => f.department !== null);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Excel-Dateien importieren</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative rounded-lg border-2 border-dashed p-12 text-center transition-colors
              ${
                isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-gray-50 hover:border-primary-400'
              }
            `}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="sr-only"
              multiple
              accept=".xlsx,.xlsm,.xls"
              onChange={handleFileInput}
            />

            <div className="space-y-4">
              <div className="text-6xl">📊</div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Dateien hierher ziehen oder klicken
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Sie können alle drei Excel-Dateien gleichzeitig hochladen
                </p>
              </div>

              <label htmlFor="file-upload">
                <Button as="span" variant="outline">
                  Dateien auswählen
                </Button>
              </label>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                  <span>Sales</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                  <span>Produktion</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-purple-500"></span>
                  <span>Controlling</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ausgewählte Dateien ({selectedFiles.length})</CardTitle>
              <Button
                onClick={handleImport}
                disabled={!allFilesHaveDepartment}
              >
                Import starten
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedFiles.map((fileWithDept, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  {/* File Icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-xl">
                    📄
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {fileWithDept.file.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(fileWithDept.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Department Selection */}
                  <div className="flex-shrink-0">
                    <select
                      value={fileWithDept.department || ''}
                      onChange={(e) => updateDepartment(index, e.target.value as Department)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Bitte wählen...</option>
                      <option value="sales">Sales (Offene Lieferungen)</option>
                      <option value="production">Produktion (Soll-Ist)</option>
                      <option value="projectManagement">Controlling</option>
                    </select>
                  </div>

                  {/* Department Badge */}
                  {fileWithDept.department && (
                    <div
                      className={`
                        flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium
                        ${getDepartmentColor(fileWithDept.department)}
                      `}
                    >
                      {getDepartmentLabel(fileWithDept.department)}
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(index)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {!allFilesHaveDepartment && (
              <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-sm text-yellow-800">
                  Bitte wählen Sie für alle Dateien eine Abteilung aus.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
