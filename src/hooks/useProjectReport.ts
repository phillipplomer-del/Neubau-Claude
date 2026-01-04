/**
 * Hook for generating AI project reports
 */

import { useState, useCallback } from 'react';
import { generateProjectReport, type ProjectReport, type ProjectReportRequest } from '@/lib/ai/geminiService';

interface UseProjectReportResult {
  report: ProjectReport | null;
  loading: boolean;
  error: string | null;
  generateReport: (request: ProjectReportRequest) => Promise<void>;
  clearReport: () => void;
}

export function useProjectReport(): UseProjectReportResult {
  const [report, setReport] = useState<ProjectReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: ProjectReportRequest) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateProjectReport(request);
      setReport(result);
    } catch (err) {
      console.error('Error generating report:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unbekannter Fehler bei der Berichterstellung');
      }
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearReport = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return {
    report,
    loading,
    error,
    generateReport: generate,
    clearReport,
  };
}
