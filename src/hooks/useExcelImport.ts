/**
 * Hook for Excel Import
 * Manages the entire import workflow with Web Worker
 */

import { useState, useCallback } from 'react';
import type {
  Department,
  ImportProgress,
  ImportResult,
  ValidationResult,
} from '@/types/common';
import { validateData, shouldSkipSalesRow } from '@/lib/excel/validator';
import {
  getColumnMapping,
  mapRowData,
  autoDetectMapping,
} from '@/lib/excel/mapper';
import { salesRepository } from '@/lib/db/repositories/salesRepository';
import { productionRepository } from '@/lib/db/repositories/productionRepository';
import { projectRepository } from '@/lib/db/repositories/projectRepository';
import { parseAndStoreTimeSeries } from '@/lib/controlling/timeseriesParser';
import type { SalesEntry } from '@/types/sales';
import type { ProductionEntry } from '@/types/production';
import type { ProjectManagementEntry } from '@/types/projectManagement';

export interface UseExcelImportReturn {
  isImporting: boolean;
  progress: ImportProgress | null;
  result: ImportResult | null;
  error: string | null;
  importFile: (file: File, department: Department) => Promise<void>;
  reset: () => void;
}

export function useExcelImport(): UseExcelImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  const importFile = useCallback(
    async (file: File, department: Department) => {
      setIsImporting(true);
      setError(null);
      setProgress({
        stage: 'parsing',
        processed: 0,
        total: 100,
        percentage: 0,
        message: 'Wird vorbereitet...',
      });

      const startTime = Date.now();

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Create Web Worker
        const worker = new Worker(
          new URL('../workers/excelParser.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Promise to handle worker communication
        const parseResult = await new Promise<{
          rows: Record<string, unknown>[];
          columns: string[];
          totalRows: number;
        }>((resolve, reject) => {
          worker.onmessage = (event) => {
            const message = event.data;

            if (message.type === 'progress') {
              setProgress(message.data);
            } else if (message.type === 'complete') {
              resolve(message.data);
            } else if (message.type === 'error') {
              reject(new Error(message.error));
            }
          };

          worker.onerror = (err) => {
            reject(new Error(`Worker error: ${err.message}`));
          };

          // Send file to worker
          worker.postMessage({
            type: 'parse',
            file: arrayBuffer,
            department,
            fileName: file.name,
          });
        });

        // Terminate worker
        worker.terminate();

        console.log('[Hook] Rows from worker:', parseResult.rows.length);
        console.log('[Hook] Columns from worker:', parseResult.columns);

        // Get or auto-detect column mapping
        let columnMappings = getColumnMapping(department);
        if (columnMappings.length === 0) {
          columnMappings = autoDetectMapping(parseResult.columns, department);
        }

        // Map rows to internal structure
        setProgress({
          stage: 'storing',
          processed: 0,
          total: parseResult.rows.length,
          percentage: 0,
          message: 'Daten werden verarbeitet...',
        });

        const mappedRows = parseResult.rows.map((row, index) => {
          if (index % 100 === 0) {
            setProgress({
              stage: 'storing',
              processed: index,
              total: parseResult.rows.length,
              percentage: (index / parseResult.rows.length) * 100,
              message: `${index} von ${parseResult.rows.length} Zeilen verarbeitet...`,
            });
          }

          return mapRowData(row, columnMappings, department);
        });

        // Add sourceFile to all rows
        mappedRows.forEach((row) => {
          row.sourceFile = file.name;
        });

        // Validate data
        setProgress({
          stage: 'validating',
          processed: 0,
          total: mappedRows.length,
          percentage: 0,
          message: 'Daten werden validiert...',
        });

        // Filter out skipped rows for Sales BEFORE validation
        let finalRows = mappedRows;
        if (department === 'sales') {
          console.log('Total rows before filtering:', mappedRows.length);
          finalRows = mappedRows.filter((row) => {
            const qtyRem = row.quantityRemaining;
            const shouldSkip = qtyRem === 0 || qtyRem === '0';
            return !shouldSkip; // Keep row if NOT skipping
          });
          console.log('Rows after filtering (QuantityRem > 0):', finalRows.length);
        }

        const validation: ValidationResult = validateData(finalRows, {
          rules: [], // Rules will be added in next iteration
        });

        // Store in IndexedDB
        setProgress({
          stage: 'storing',
          processed: 0,
          total: finalRows.length,
          percentage: 0,
          message: 'Daten werden in der Datenbank gespeichert...',
        });

        // Clear existing data for this department
        if (department === 'sales') {
          await salesRepository.clear();
        } else if (department === 'production') {
          await productionRepository.clear();
        } else if (department === 'projectManagement') {
          await projectRepository.clear();

          // Also parse and store time series data from Tabelle2
          try {
            const timeseriesCount = await parseAndStoreTimeSeries(file);
            console.log('[Hook] Time series entries stored:', timeseriesCount);
          } catch (err) {
            console.warn('[Hook] Could not parse time series data:', err);
          }
        }

        // Store data in batches for better performance
        const batchSize = 500;
        for (let i = 0; i < finalRows.length; i += batchSize) {
          const batch = finalRows.slice(i, i + batchSize);

          if (department === 'sales') {
            await salesRepository.addMany(batch as SalesEntry[]);
          } else if (department === 'production') {
            await productionRepository.addMany(batch as ProductionEntry[]);
          } else if (department === 'projectManagement') {
            await projectRepository.addMany(batch as ProjectManagementEntry[]);
          }

          setProgress({
            stage: 'storing',
            processed: Math.min(i + batchSize, finalRows.length),
            total: finalRows.length,
            percentage: (Math.min(i + batchSize, finalRows.length) / finalRows.length) * 100,
            message: `${Math.min(i + batchSize, finalRows.length)} von ${finalRows.length} Zeilen gespeichert...`,
          });
        }

        const duration = Date.now() - startTime;

        setProgress({
          stage: 'complete',
          processed: finalRows.length,
          total: finalRows.length,
          percentage: 100,
          message: 'Import abgeschlossen!',
        });

        setResult({
          success: true,
          department,
          fileName: file.name,
          rowsImported: finalRows.length,
          validation,
          importedAt: new Date(),
          duration,
        });

        setIsImporting(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unbekannter Fehler';
        setError(errorMessage);
        setIsImporting(false);
      }
    },
    []
  );

  return {
    isImporting,
    progress,
    result,
    error,
    importFile,
    reset,
  };
}
