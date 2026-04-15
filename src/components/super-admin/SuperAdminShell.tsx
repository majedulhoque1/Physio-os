import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Building2,
  HardHat,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProducts } from "@/hooks/useProducts";
import "../../styles/super-admin.css";

const topNav = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Dashboard", end: true },
];

const bottomNav = [
  { to: "/super-admin/billing", icon: CreditCard, label: "Billing", end: false },
  { to: "/super-admin/settings", icon: SettingsIcon, label: "Settings", end: false },
];

export function SuperAdminShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(
    location.pathname.startsWith("/super-admin/products"),
  );
  const { products } = useProducts({ onlyActive: true });
  const iconMap: Record<string, typeof Building2> = {
    building: Building2,
    hardhat: HardHat,
    package: Package,
  };
  const productItems = products.map((p) => ({
    to: `/super-admin/products/${p.product_key}`,
    icon: iconMap[p.icon_key ?? ""] ?? Package,
    label: p.display_name,
  }));

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
            style={{ background: "#000", border: "2px solid #4ADE80" }}
          >
            <Shield className="h-4 w-4" style={{ color: "#4ADE80" }} />
          </div>
          <div>
            <p className="nb-heading text-sm text-black">Platform Admin</p>
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
          {topNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-all ${
                  isActive ? "bg-[#4ADE80] text-black" : "text-black hover:bg-yellow-100"
                }`
              }
              style={({ isActive }) => ({
                border: isActive ? "2px solid #000" : "2px solid transparent",
                borderRadius: "2px",
              })}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}

          {/* Products domain */}
          <button
            onClick={() => setProductsOpen((o) => !o)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-bold text-black hover:bg-yellow-100 transition-all"
            style={{ border: "2px solid transparent", borderRadius: "2px" }}
          >
            <Package className="h-4 w-4" />
            Products
            <ChevronDown
              className={`h-3.5 w-3.5 ml-auto transition-transform ${productsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {productsOpen && (
            <div className="ml-3 space-y-1" style={{ borderLeft: "2px solid #000", paddingLeft: "8px" }}>
              {productItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isActive ? "bg-[#4ADE80] text-black" : "text-black hover:bg-yellow-100"
                    }`
                  }
                  style={({ isActive }) => ({
                    border: isActive ? "2px solid #000" : "2px solid transparent",
                    borderRadius: "2px",
                  })}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}

          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm font-bold transition-all ${
                  isActive ? "bg-[#4ADE80] text-black" : "text-black hover:bg-yellow-100"
                }`
              }
              style={({ isActive }) => ({
                border: isActive ? "2px solid #000" : "2px solid transparent",
                borderRadius: "2px",
              })}
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
