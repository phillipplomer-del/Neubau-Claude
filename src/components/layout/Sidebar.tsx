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
];

export default function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' && location.search === '';
    }
    // Handle paths with query parameters - exact match required
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      return location.pathname === pathname && location.search === `?${query}`;
    }
    // For dashboard paths (exact section root), require exact match
    if (path === '/sales' || path === '/sales/dashboard' || path === '/production' || path === '/projects/controlling' || path === '/datacomparison') {
      return location.pathname === path && location.search === '';
    }
    // For other paths, use startsWith but ensure no query params
    return location.pathname.startsWith(path) && location.search === '';
  };

  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-sidebar-border bg-sidebar overflow-y-auto transition-all duration-300 z-40 font-sans ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <nav className={`p-4 space-y-6 ${collapsed ? 'px-2' : ''}`}>
        {navigation.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();

                  // Parse the path into pathname and search
                  if (item.path.includes('?')) {
                    const [pathname, search] = item.path.split('?');
                    navigate(`${pathname}?${search}`);
                  } else {
                    navigate(item.path);
                  }
                };

                const IconComponent = item.icon;

                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={handleClick}
                    className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                      collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
                    } ${
                      isActive(item.path)
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <IconComponent className="h-5 w-5 flex-shrink-0" />
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
