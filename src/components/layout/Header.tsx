import { Link } from 'react-router-dom';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export default function Header({ sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onSidebarToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 hover:border-primary-500 transition-colors"
            title={sidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
          >
            <span className="text-lg font-bold text-gray-700">
              {sidebarCollapsed ? '☰' : '←'}
            </span>
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-600 text-white font-bold">
              P
            </div>
            <span className="text-xl font-semibold text-gray-900">
              PPS System
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/import"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Import
          </Link>
        </nav>
      </div>
    </header>
  );
}
