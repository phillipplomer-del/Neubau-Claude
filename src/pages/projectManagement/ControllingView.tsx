/**
 * Controlling View Page
 * Displays project and turnover trends, pie charts, and financial summary
 * Data is loaded from the shared import (via Import page)
 */

import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useControllingData } from '@/hooks/useControllingData';
import ControllingChart from './components/ControllingChart';
import ControllingKPIs from './components/ControllingKPIs';
import ProjectPieCharts from './components/ProjectPieCharts';
import FinancialBarChart from './components/FinancialBarChart';
import Button from '@/components/ui/Button';

export default function ControllingView() {
  const { data, projects, years, loading, error, clearData } = useControllingData();
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Handle clear data
  const handleClearData = useCallback(async () => {
    if (window.confirm('Möchten Sie alle Controlling-Daten löschen?')) {
      await clearData();
    }
  }, [clearData]);

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;

    setExporting(true);
    try {
      const element = reportRef.current;

      // Create canvas from HTML
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Calculate PDF dimensions (A4)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Add title
      pdf.setFontSize(16);
      pdf.text('Controlling Bericht', 105, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 105, 22, { align: 'center' });

      // Add content image
      const imgData = canvas.toDataURL('image/png');
      let heightLeft = imgHeight;
      let position = 30; // Start after title

      // Add first page content
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      pdf.save(`Controlling_Bericht_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF Export error:', err);
      alert('Fehler beim PDF-Export');
    } finally {
      setExporting(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Daten...</div>
      </div>
    );
  }

  const hasData = data.length > 0 || projects.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Controlling</h1>

        <div className="flex items-center gap-3">
          {hasData && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exporting}
              >
                {exporting ? 'Exportiere...' : 'Als PDF exportieren'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearData}>
                Daten löschen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Content when data is available */}
      {hasData ? (
        <div ref={reportRef} className="space-y-6 bg-white">
          {/* KPI Cards */}
          {projects.length > 0 && (
            <ControllingKPIs projects={projects} />
          )}

          {/* Pie Charts - Projects by Manager and Category */}
          {projects.length > 0 && (
            <ProjectPieCharts projects={projects} />
          )}

          {/* Financial Bar Chart */}
          {projects.length > 0 && (
            <FinancialBarChart projects={projects} />
          )}

          {/* Time Series Chart */}
          {data.length > 0 && (
            <ControllingChart data={data} years={years} />
          )}

          {/* Data Info */}
          <div className="text-sm text-gray-500 text-center">
            {projects.length > 0 && `${projects.length} Projekte`}
            {projects.length > 0 && data.length > 0 && ' • '}
            {data.length > 0 && `${data.length} Zeitreihen-Datenpunkte`}
            {years.length > 0 && ` • Jahre: ${years.join(', ')}`}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-medium text-gray-900">Keine Controlling-Daten vorhanden</p>
          <p className="mt-2 text-gray-600">
            Die Daten werden automatisch geladen, wenn Sie die Controlling.xlsx über die Import-Seite hochladen.
          </p>
          <Link
            to="/import"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Zum Import
          </Link>
        </div>
      )}
    </div>
  );
}
