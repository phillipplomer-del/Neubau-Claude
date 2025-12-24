import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Eye,
  AlertTriangle,
  ClipboardList,
  GanttChart,
  TrendingUp,
  Folders,
  GitCompare,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
}

const navigation: NavSection[] = [
  {
    title: 'Sales',
    items: [
      { label: 'Dashboard', path: '/sales/dashboard', icon: LayoutDashboard },
      { label: 'Lieferungen', path: '/sales', icon: Package },
      { label: 'Beobachtete', path: '/sales?status=watched', icon: Eye },
      { label: 'Kritische', path: '/sales?status=critical,at-risk', icon: AlertTriangle },
    ],
  },
  {
    title: 'Produktion',
    items: [
      { label: 'Dashboard', path: '/production', icon: LayoutDashboard },
      { label: 'Planung', path: '/production/planning', icon: ClipboardList },
      { label: 'Gantt', path: '/production/gantt', icon: GanttChart },
      { label: 'Soll-Ist', path: '/production/comparison', icon: TrendingUp },
    ],
  },
  {
    title: 'Projektmanagement',
    items: [
      { label: 'Dashboard', path: '/projects/controlling', icon: LayoutDashboard },
      { label: 'Projekte', path: '/projects/list', icon: Folders },
    ],
  },
  {
    title: 'Datenabgleich',
    items: [
      { label: 'Vergleich', path: '/datacomparison', icon: GitCompare },
    ],
  },
  {
    title: 'Visualisierung',
    items: [
      { label: 'Ansicht 1', path: '/visualization/view1', icon: BarChart3 },
      { label: 'Ansicht 2', path: '/visualization/view2', icon: PieChart },
      { label: 'Ansicht 3', path: '/visualization/view3', icon: LineChart },
      { label: 'Ansicht 4', path: '/visualization/view4', icon: Activity },
    ],
  },
];

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' && location.search === '';
    }
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      return location.pathname === pathname && location.search === `?${query}`;
    }
    if (path === '/sales' || path === '/sales/dashboard' || path === '/production' || path === '/projects/controlling' || path === '/datacomparison') {
      return location.pathname === path && location.search === '';
    }
    return location.pathname.startsWith(path) && location.search === '';
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-sidebar-border bg-sidebar overflow-y-auto transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <nav className={`py-6 space-y-6 ${collapsed ? 'px-2' : 'px-3'}`}>
        {navigation.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3
                className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (item.path.includes('?')) {
                    const [pathname, search] = item.path.split('?');
                    navigate(`${pathname}?${search}`);
                  } else {
                    navigate(item.path);
                  }
                };

                const IconComponent = item.icon;
                const active = isActive(item.path);

                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={handleClick}
                    className={`flex items-center rounded-[var(--radius-chip)] text-sm font-medium transition-all duration-300 sidebar-icon-animate ${
                      collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'
                    } ${
                      active
                        ? 'gradient-main text-white shadow-[var(--shadow-chip)]'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComponent
                      className={`h-5 w-5 flex-shrink-0 ${active ? '' : ''}`}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
