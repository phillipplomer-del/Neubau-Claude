import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { clearStore } from '@/lib/db';
import { STORE_NAMES } from '@/types/database';

export default function Home() {
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleClearData = useCallback(async () => {
    if (!window.confirm('Möchten Sie alle importierten Daten löschen?\n\nKommentare und Markierungen bleiben erhalten.')) {
      return;
    }

    setClearing(true);
    setClearSuccess(false);

    try {
      // Nur Sales-Daten löschen (Kommentare sind in Firebase und bleiben erhalten)
      await clearStore(STORE_NAMES.SALES);
      setClearSuccess(true);

      // Nach 3 Sekunden Erfolgsmeldung ausblenden
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Daten');
    } finally {
      setClearing(false);
    }
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          PPS - Produktionsplanungs-System
        </h1>
        <p className="mt-2 text-gray-600">
          Willkommen im integrierten Management-System für Sales, Produktion und
          Projektmanagement
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sales Card */}
        <Link to="/sales">
          <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
                  📦
                </div>
                <CardTitle>Sales</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Offene Lieferungen, Kundenaufträge und Lieferstatus verwalten
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Production Card */}
        <Link to="/production">
          <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">
                  🏭
                </div>
                <CardTitle>Produktion</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Produktionsplanung, Soll-Ist Vergleich und Gantt-Charts
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Projects Card */}
        <Link to="/projects">
          <Card className="transition-shadow hover:shadow-lg cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">
                  📁
                </div>
                <CardTitle>Projektmanagement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Projekte, Controlling und Budget-Überwachung
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Daten importieren</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">
            Laden Sie Excel-Dateien von Sales, Produktion und Projektmanagement hoch
          </p>
          <Link
            to="/import"
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <span>📤</span>
            <span>Zum Import</span>
          </Link>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>Daten verwalten</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600">
            Importierte Daten zurücksetzen, um neue Daten hochzuladen. Kommentare und Markierungen bleiben erhalten.
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearData}
              disabled={clearing}
            >
              {clearing ? 'Lösche...' : 'Importierte Daten löschen'}
            </Button>
            {clearSuccess && (
              <span className="text-sm text-green-600 font-medium">
                Daten erfolgreich gelöscht
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
