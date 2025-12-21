/**
 * File Uploader Component with Drag & Drop
 */

import { useCallback, useState } from 'react';
import type { Department } from '@/types/common';

interface FileUploaderProps {
  department: Department;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploader({
  department,
  onFileSelected,
  disabled = false,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const excelFile = files.find(
        (f) =>
          f.name.endsWith('.xlsx') ||
          f.name.endsWith('.xls') ||
          f.name.endsWith('.xlsm')
      );

      if (excelFile) {
        onFileSelected(excelFile);
      }
    },
    [disabled, onFileSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
      // Reset input
      e.target.value = '';
    },
    [onFileSelected]
  );

  const departmentLabels: Record<Department, string> = {
    sales: 'Sales (Offene Lieferungen)',
    production: 'Produktion (Soll-Ist Vergleich)',
    projectManagement: 'Projektmanagement (Controlling)',
  };

  const departmentIcons: Record<Department, string> = {
    sales: '📦',
    production: '🏭',
    projectManagement: '📁',
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-8 transition-all ${
        isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-300 bg-white hover:border-primary-400'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.xlsm"
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        id={`file-upload-${department}`}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-4xl">
          {departmentIcons[department]}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {departmentLabels[department]}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {isDragging
              ? 'Datei hier ablegen...'
              : 'Excel-Datei hier ablegen oder klicken zum Auswählen'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>📄</span>
          <span>Unterstützte Formate: .xlsx, .xls, .xlsm</span>
        </div>

        {!disabled && (
          <label
            htmlFor={`file-upload-${department}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer"
          >
            <span>📤</span>
            <span>Datei auswählen</span>
          </label>
        )}
      </div>
    </div>
  );
}
