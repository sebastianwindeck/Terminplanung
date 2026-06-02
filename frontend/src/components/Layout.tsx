import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CalendarDays, FolderOpen, AlertTriangle, Settings, Building2, UserCog, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS = {
  main_admin: "Hauptadmin",
  company_admin: "Firmenadmin",
  company_user: "Benutzer",
} as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? "bg-primary-900/60" : "hover:bg-primary-600"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-700 text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <CalendarDays className="w-6 h-6" />
            Terminplanung
          </NavLink>

          <nav className="flex items-center gap-1 ml-4">
            <NavLink to="/" end className={navLinkClass}>
              <FolderOpen className="w-4 h-4" />
              Projekte
            </NavLink>
            <NavLink to="/stoerungen" className={navLinkClass}>
              <AlertTriangle className="w-4 h-4" />
              Störungen
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              <Settings className="w-4 h-4" />
              Einstellungen
            </NavLink>
            {user && (user.role === "main_admin" || user.role === "company_admin") && (
              <NavLink to="/admin/users" className={navLinkClass}>
                <UserCog className="w-4 h-4" />
                Benutzer
              </NavLink>
            )}
            {user?.role === "main_admin" && (
              <NavLink to="/admin/companies" className={navLinkClass}>
                <Building2 className="w-4 h-4" />
                Unternehmen
              </NavLink>
            )}
          </nav>

          {/* User menu */}
          {user && (
            <div className="ml-auto relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 hover:bg-primary-600 px-3 py-1.5 rounded-md transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-xs font-bold">
                  {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium leading-none">{user.full_name ?? user.email}</div>
                  <div className="text-xs text-primary-300 mt-0.5">{ROLE_LABELS[user.role]}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-primary-300" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-900 truncate">{user.email}</div>
                    <div className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          )}
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
