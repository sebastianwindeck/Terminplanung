import { Outlet, NavLink } from "react-router-dom";
import { CalendarDays, FolderOpen, BarChart3, Settings } from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-700 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <CalendarDays className="w-6 h-6" />
            Terminplanung
          </NavLink>
          <nav className="flex items-center gap-1 ml-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-900/60" : "hover:bg-primary-600"
                }`
              }
            >
              <FolderOpen className="w-4 h-4" />
              Projekte
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-primary-900/60" : "hover:bg-primary-600"
                }`
              }
            >
              <Settings className="w-4 h-4" />
              Einstellungen
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-primary-200 text-xs">
            <BarChart3 className="w-4 h-4" />
            v1.0
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white text-center text-xs text-gray-400 py-3">
        Terminplanung &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
