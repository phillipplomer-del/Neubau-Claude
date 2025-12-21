import { Link } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Home() {
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
    </div>
  );
}
