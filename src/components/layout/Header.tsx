import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useUserContext } from '@/contexts/UserContext';
import { Menu, ChevronLeft, Home, Upload, Sun, Moon, User, LogOut } from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export default function Header({ sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const { isDark, toggle } = useDarkMode();
  const { user, logout } = useUserContext();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onSidebarToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card hover:bg-accent hover:border-primary transition-colors"
            title={sidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4 text-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-foreground" />
            )}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">
              G
            </div>
            <span className="text-xl font-semibold text-foreground">
              Galadriel
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            to="/import"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card hover:bg-accent transition-colors"
            title={isDark ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren'}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-foreground" />
            )}
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                title={user.fullName}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline">{user.firstName}</span>
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">Angemeldet</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Abmelden
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
