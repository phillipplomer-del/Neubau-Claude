import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import { useUserContext } from '@/contexts/UserContext';
import { Package, Factory, FolderKanban, Clock, TrendingUp, AlertTriangle, Euro } from 'lucide-react';

export default function Home() {
  const { user } = useUserContext();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="space-y-7">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[26px] font-bold text-foreground"
            style={{ fontFamily: 'var(--font-display)', lineHeight: 1.2 }}
          >
            Willkommen{user?.firstName ? `, ${user.firstName}` : ' bei Galadriel'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ihr Business Intelligence Dashboard für Sales, Produktion und Projektmanagement
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-full bg-card-muted flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <span
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatTime(currentTime)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(currentTime)}</p>
        </div>
      </div>

      {/* App Description Card */}
      <Card variant="muted" className="p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold gradient-text">Galadriel</span> unterstützt Sie bei der täglichen Arbeit:
          Überwachen Sie offene Lieferungen im Sales-Bereich, planen Sie Produktionskapazitäten und behalten Sie Ihre Projekte im Blick.
          Importieren Sie Ihre Excel-Daten und erhalten Sie aussagekräftige Auswertungen und KPIs.
        </p>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          value="--"
          label="Offene Lieferungen"
          gradient={1}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          value="--"
          label="Kritische Aufträge"
          gradient={2}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value="--"
          label="Aktive Projekte"
          gradient={3}
        />
        <StatCard
          icon={<Euro className="h-5 w-5" />}
          value="--"
          label="Offener Umsatz"
          gradient={4}
        />
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Card */}
        <Link to="/sales" className="block group">
          <Card animate className="h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-card-1 mb-5 shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h3
                className="text-lg font-semibold text-foreground mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Sales
              </h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Offene Lieferungen, Kundenaufträge und Lieferstatus verwalten
              </p>
            </div>
          </Card>
        </Link>

        {/* Production Card */}
        <Link to="/production" className="block group">
          <Card animate className="h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-card-2 mb-5 shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                <Factory className="h-8 w-8 text-white" />
              </div>
              <h3
                className="text-lg font-semibold text-foreground mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Produktion
              </h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Produktionsplanung, Soll-Ist Vergleich und Gantt-Charts
              </p>
            </div>
          </Card>
        </Link>

        {/* Projects Card */}
        <Link to="/projects" className="block group">
          <Card animate className="h-full">
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-card-3 mb-5 shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                <FolderKanban className="h-8 w-8 text-white" />
              </div>
              <h3
                className="text-lg font-semibold text-foreground mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Projektmanagement
              </h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Projekte, Controlling und Budget-Überwachung
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
