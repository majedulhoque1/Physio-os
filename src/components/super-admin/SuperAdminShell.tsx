import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "../../styles/super-admin.css";

const navItems = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants", end: false },
  { to: "/super-admin/billing", icon: CreditCard, label: "Billing", end: false },
  { to: "/super-admin/settings", icon: SettingsIcon, label: "Settings", end: false },
];

export function SuperAdminShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/super-admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white transition-transform lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRight: "3px solid #000" }}
      >
        {/* Brand */}
        <div
          className="flex h-14 items-center gap-2.5 px-4"
          style={{ borderBottom: "3px solid #000" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center"
            style={{ background: "#000", border: "2px solid #000" }}
          >
            <Shield className="h-4 w-4" style={{ color: "#4ADE80" }} />
          </div>
          <div>
            <p className="nb-heading text-sm text-black leading-none">Physio OS</p>
            <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">System Admin</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-black hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? "bg-[#4ADE80] text-black"
                    : "text-black hover:bg-yellow-100"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { border: "2px solid #000", borderRadius: "2px" }
                  : { border: "2px solid transparent", borderRadius: "2px" }
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: "3px solid #000" }}>
          <p className="mb-1.5 truncate px-2 text-xs text-gray-500 font-bold uppercase">Super Admin</p>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-100 transition-colors"
            style={{ border: "2px solid transparent", borderRadius: "2px" }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="flex h-12 items-center gap-3 bg-white px-4 lg:hidden"
          style={{ borderBottom: "3px solid #000" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-black"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="nb-heading text-sm text-black">System Admin</span>
        </header>

        {/* Page content */}
        <main className="nb-bg flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
