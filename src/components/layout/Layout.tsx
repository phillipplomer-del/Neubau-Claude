import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-full">
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={`flex-1 overflow-y-auto bg-gray-50 p-4 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
