/**
 * Validation Results Display
 * Shows errors and warnings from import validation
 */

import { useState } from 'react';
import type { ValidationResult } from '@/types/common';
import Button from '@/components/ui/Button';

interface ValidationResultsProps {
  validation: ValidationResult;
}

export default function ValidationResults({
  validation,
}: ValidationResultsProps) {
  const [showDetails, setShowDetails] = useState(false);

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
            ✅
          </div>
          <div>
            <h3 className="font-semibold text-green-900">
              Alle Daten sind gültig
            </h3>
            <p className="text-sm text-green-700">
              {validation.rowsValid.toLocaleString('de-DE')} von{' '}
              {validation.rowsProcessed.toLocaleString('de-DE')} Zeilen erfolgreich importiert
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`rounded-lg border p-4 ${
        hasErrors
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
              hasErrors ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {hasErrors ? '❌' : '⚠️'}
            </div>
            <div>
              <h3 className={`font-semibold ${
                hasErrors ? 'text-red-900' : 'text-yellow-900'
              }`}>
                {hasErrors ? 'Import mit Fehlern' : 'Import mit Warnungen'}
              </h3>
              <div className={`mt-1 space-y-1 text-sm ${
                hasErrors ? 'text-red-700' : 'text-yellow-700'
              }`}>
                <p>
                  {validation.rowsValid.toLocaleString('de-DE')} von{' '}
                  {validation.rowsProcessed.toLocaleString('de-DE')} Zeilen gültig
                </p>
                {hasErrors && (
                  <p>❌ {validation.errors.length} Fehler</p>
                )}
                {hasWarnings && (
                  <p>⚠️ {validation.warnings.length} Warnungen</p>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
          </Button>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="space-y-4">
          {/* Errors */}
          {hasErrors && (
            <div>
              <h4 className="mb-2 font-semibold text-red-900">
                Fehler ({validation.errors.length})
              </h4>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-white p-4 border border-red-200">
                {validation.errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 font-mono text-gray-500">
                      Zeile {error.row}:
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {error.column}
                      </p>
                      <p className="text-red-600">{error.message}</p>
                      {error.value !== null && error.value !== undefined && (
                        <p className="text-gray-500">
                          Wert: {String(error.value)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div>
              <h4 className="mb-2 font-semibold text-yellow-900">
                Warnungen ({validation.warnings.length})
              </h4>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-white p-4 border border-yellow-200">
                {validation.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="flex-shrink-0 font-mono text-gray-500">
                      Zeile {warning.row}:
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {warning.column}
                      </p>
                      <p className="text-yellow-600">{warning.message}</p>
                      {warning.value !== null && warning.value !== undefined && (
                        <p className="text-gray-500">
                          Wert: {String(warning.value)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
