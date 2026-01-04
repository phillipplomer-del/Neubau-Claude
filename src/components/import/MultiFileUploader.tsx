/**
 * Multi-File Uploader Component
 * Allows uploading all three Excel files at once with drag-and-drop
 */

import { useState, useCallback } from 'react';
import type { Department } from '@/types/common';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CloudUpload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

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

    setSelectedFiles((prev) => [...prev, ...filesWithDept]);
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
    if (dept === 'sales') return 'Sales';
    if (dept === 'production') return 'Produktion';
    if (dept === 'projectManagement') return 'Controlling';
    return dept;
  };

  const getDepartmentColor = (dept: Department | null): string => {
    if (!dept) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (dept === 'sales') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (dept === 'production') return 'bg-green-50 text-green-700 border-green-200';
    if (dept === 'projectManagement') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const allFilesHaveDepartment = selectedFiles.length > 0 && selectedFiles.every((f) => f.department !== null);

  return (
    <div className="space-y-8">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Excel-Dateien importieren</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              relative group cursor-pointer
              rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'
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

            <label htmlFor="file-upload" className="cursor-pointer space-y-4">
              <div className={`
                mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500
                ${isDragging ? 'bg-primary/20 scale-110' : 'bg-muted group-hover:bg-primary/10 group-hover:scale-105'}
              `}>
                <CloudUpload className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              </div>

              <div>
                <p className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
                  Dateien hier ablegen
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ziehen Sie Ihre Excel-Dateien einfach hierher oder klicken Sie zum Auswählen.
                  <br />
                  <span className="opacity-60 text-xs">Unterstützt .xlsx, .xlsm, .xls</span>
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card-muted border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  <span>Sales</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card-muted border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span>Produktion</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card-muted border border-border/50">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                  <span>Controlling</span>
                </div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files List */}
      <div className={`transition-all duration-500 ${selectedFiles.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
              {selectedFiles.length}
            </span>
            Ausgewählte Dateien
          </h3>

          <Button
            onClick={handleImport}
            disabled={!allFilesHaveDepartment}
            className={`transition-all duration-300 ${allFilesHaveDepartment ? 'shadow-[var(--shadow-glow)] hover:scale-105' : 'opacity-50'}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Import starten
          </Button>
        </div>

        <div className="grid gap-3">
          {selectedFiles.map((fileWithDept, index) => (
            <div
              key={index}
              className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20"
            >
              {/* File Icon */}
              <div className={`
                flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-300
                ${fileWithDept.department ? getDepartmentColor(fileWithDept.department).split(' ')[0] : 'bg-muted'}
              `}>
                <FileSpreadsheet className={`h-6 w-6 ${fileWithDept.department ? 'text-current' : 'text-muted-foreground'}`} />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {fileWithDept.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(fileWithDept.file.size / 1024 / 1024).toFixed(2)} MB • Excel Arbeitsmappe
                </p>
              </div>

              {/* Department Selection */}
              <div className="flex-shrink-0 min-w-[200px]">
                <div className="relative">
                  <select
                    value={fileWithDept.department || ''}
                    onChange={(e) => updateDepartment(index, e.target.value as Department)}
                    className={`
                      w-full appearance-none rounded-lg border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all
                      ${getDepartmentColor(fileWithDept.department)}
                    `}
                  >
                    <option value="">Abteilung wählen...</option>
                    <option value="sales">Sales (Offene Lief.)</option>
                    <option value="production">Produktion (Soll-Ist)</option>
                    <option value="projectManagement">Controlling</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-current opacity-50">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeFile(index)}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                title="Entfernen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {!allFilesHaveDepartment && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200 p-4 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Bitte weisen Sie jeder Datei eine Abteilung zu, um fortzufahren.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
