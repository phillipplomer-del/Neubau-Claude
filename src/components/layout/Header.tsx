import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useUserContext } from '@/contexts/UserContext';
import TimerWidget from '@/pages/timeTracking/TimerWidget';
import { Menu, ChevronLeft, Home, Upload, Sun, Moon, User, LogOut } from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export default function Header({ sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const { isDark, toggle } = useDarkMode();
  const { user, logout } = useUserContext();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card shadow-[var(--shadow-chip)]">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <button
            onClick={onSidebarToggle}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-chip)] bg-card-muted text-muted-foreground hover:text-foreground icon-btn-animate"
            title={sidebarCollapsed ? 'Sidebar erweitern' : 'Sidebar einklappen'}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-main gradient-shift text-white font-bold text-lg shadow-[var(--shadow-glow)]">
              ▲
            </div>
            <span
              className="text-xl font-semibold gradient-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              PVCS Prism
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          {/* Nav Links */}
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-[var(--radius-chip)] hover:bg-card-muted transition-all duration-300"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          {/* Timer Widget */}
          <TimerWidget />

          <Link
            to="/import"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-[var(--radius-chip)] hover:bg-card-muted transition-all duration-300"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card-muted text-muted-foreground hover:text-foreground icon-btn-animate"
            title={isDark ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren'}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* User Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300"
                title={user.fullName}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-main text-white avatar-animate">
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
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-[var(--radius-card)] border border-border/50 bg-card shadow-[var(--shadow-hover)] z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 bg-card-muted">
                      <p
                        className="text-sm font-semibold text-foreground"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {user.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">Angemeldet</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        navigate('/landing');
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all duration-300"
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
