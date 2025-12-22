import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { clearStore } from '@/lib/db';
import { STORE_NAMES } from '@/types/database';
import { Package, Factory, FolderKanban, Upload, Trash2, Clock } from 'lucide-react';

export default function Home() {
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleClearData = useCallback(async () => {
    if (!window.confirm('Möchten Sie alle importierten Daten löschen?\n\nKommentare und Markierungen bleiben erhalten.')) {
      return;
    }

    setClearing(true);
    setClearSuccess(false);

    try {
      await clearStore(STORE_NAMES.SALES);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Daten');
    } finally {
      setClearing(false);
    }
  }, []);

  // Format date and time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header with Date/Time */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Willkommen bei Galadriel
          </h1>
          <p className="mt-1 text-muted-foreground">
            Ihr Business Intelligence Dashboard für Sales, Produktion und Projektmanagement
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-semibold">{formatTime(currentTime)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(currentTime)}</p>
        </div>
      </div>

      {/* App Description */}
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Galadriel</span> unterstützt Sie bei der täglichen Arbeit:
          Überwachen Sie offene Lieferungen im Sales-Bereich, planen Sie Produktionskapazitäten und behalten Sie Ihre Projekte im Blick.
          Importieren Sie Ihre Excel-Daten und erhalten Sie aussagekräftige Auswertungen und KPIs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Offene Lieferungen</div>
          <div className="text-2xl font-bold text-primary">--</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Kritische Aufträge</div>
          <div className="text-2xl font-bold text-red-500">--</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Aktive Projekte</div>
          <div className="text-2xl font-bold text-primary">--</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-1">Offener Umsatz</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">--</div>
        </div>
      </div>

      {/* Main Navigation Cards - Large Squares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sales Card */}
        <Link to="/sales" className="block">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Sales</h3>
              <p className="text-sm text-muted-foreground text-center">
                Offene Lieferungen, Kundenaufträge und Lieferstatus verwalten
              </p>
            </div>
          </Card>
        </Link>

        {/* Production Card */}
        <Link to="/production" className="block">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                <Factory className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Produktion</h3>
              <p className="text-sm text-muted-foreground text-center">
                Produktionsplanung, Soll-Ist Vergleich und Gantt-Charts
              </p>
            </div>
          </Card>
        </Link>

        {/* Projects Card */}
        <Link to="/projects" className="block">
          <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[180px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4">
                <FolderKanban className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Projektmanagement</h3>
              <p className="text-sm text-muted-foreground text-center">
                Projekte, Controlling und Budget-Überwachung
              </p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Bottom Section: Import and Data Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Import Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daten importieren</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Laden Sie Excel-Dateien von Sales, Produktion und Projektmanagement hoch
            </p>
            <Link
              to="/import"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Zum Import</span>
            </Link>
          </CardContent>
        </Card>

        {/* Data Management Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daten verwalten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Importierte Daten zurücksetzen. Kommentare und Markierungen bleiben erhalten.
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearData}
                disabled={clearing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {clearing ? 'Lösche...' : 'Daten löschen'}
              </Button>
              {clearSuccess && (
                <span className="text-sm text-green-600 font-medium">
                  Erfolgreich gelöscht
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
