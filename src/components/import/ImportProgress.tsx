/**
 * Import Progress Indicator
 * Shows the current status and progress of Excel import
 */

import type { ImportProgress as ImportProgressType } from '@/types/common';
import Spinner from '@/components/ui/Spinner';

interface ImportProgressProps {
  progress: ImportProgressType;
}

export default function ImportProgress({ progress }: ImportProgressProps) {
  const stageLabels: Record<ImportProgressType['stage'], string> = {
    parsing: 'Excel wird verarbeitet',
    validating: 'Daten werden validiert',
    storing: 'Daten werden gespeichert',
    matching: 'Einträge werden verknüpft',
    complete: 'Abgeschlossen',
  };

  const stageIcons: Record<ImportProgressType['stage'], string> = {
    parsing: '📖',
    validating: '✅',
    storing: '💾',
    matching: '🔗',
    complete: '🎉',
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        {progress.stage !== 'complete' ? (
          <Spinner size="md" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xl">
            ✓
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {stageIcons[progress.stage]} {stageLabels[progress.stage]}
          </h3>
          <p className="text-sm text-gray-600">{progress.message}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full transition-all duration-300 ease-out bg-primary-600"
          style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {progress.processed.toLocaleString('de-DE')} von{' '}
          {progress.total.toLocaleString('de-DE')}
        </span>
        <span>{Math.round(progress.percentage)}%</span>
      </div>
    </div>
  );
}
