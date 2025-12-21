import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: string;
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
      { label: 'Dashboard', path: '/sales', icon: '📊' },
      { label: 'Lieferungen', path: '/sales/deliveries', icon: '📦' },
      { label: 'Beobachtete', path: '/sales?status=watched', icon: '🟣' },
      { label: 'Kritische', path: '/sales?status=critical,at-risk', icon: '⚠️' },
    ],
  },
  {
    title: 'Produktion',
    items: [
      { label: 'Dashboard', path: '/production', icon: '📊' },
      { label: 'Planung', path: '/production/planning', icon: '📋' },
      { label: 'Gantt', path: '/production/gantt', icon: '📅' },
      { label: 'Soll-Ist', path: '/production/comparison', icon: '📈' },
    ],
  },
  {
    title: 'Projektmanagement',
    items: [
      { label: 'Dashboard', path: '/projects', icon: '📊' },
      { label: 'Projekte', path: '/projects/list', icon: '📁' },
      { label: 'Controlling', path: '/projects/controlling', icon: '💰' },
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
    // For paths without query params, only match if there's no search query
    return location.pathname.startsWith(path) && location.search === '';
  };

  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] border-r border-gray-200 bg-white overflow-y-auto transition-all duration-300 z-40 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <nav className={`p-4 space-y-6 ${collapsed ? 'px-2' : ''}`}>
        {navigation.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
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

                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={handleClick}
                    className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                      collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
                    } ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="text-lg">{item.icon}</span>
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
