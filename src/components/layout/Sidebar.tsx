import { LogOut, Settings, UserCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDesktopNavItems, getMobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { ClinicStaffRole } from "@/types";

function roleLabel(role: ClinicStaffRole | null): string {
  switch (role) {
    case "clinic_admin":
      return "Admin";
    case "therapist":
      return "Therapist";
    case "receptionist":
      return "Receptionist";
    default:
      return "User";
  }
}

function desktopLinkClassName(isActive: boolean, isExpanded: boolean) {
  return cn(
    "group flex items-center rounded-lg mx-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
    isExpanded ? "gap-3" : "gap-0 justify-center mx-2",
    isActive
      ? "bg-white/10 text-white"
      : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-white",
  );
}

function mobileLinkClassName(isActive: boolean) {
  return cn(
    "flex flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium transition-colors relative",
    isActive
      ? "text-primary"
      : "text-muted-foreground",
  );
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}

export function Sidebar({ isExpanded, setIsExpanded }: SidebarProps) {
  const { clinic, displayName, role, signOut, user } = useAuth();
  if (!user) return null;
  const navigate = useNavigate();
  const desktopNavItems = getDesktopNavItems(role);
  const mobileNavItems = getMobileNavItems(role);

  const clinicName = clinic?.name ?? "Physio OS";
  const initials = getInitials(displayName);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col bg-sidebar transition-all duration-200 ease-out lg:flex z-30",
          isExpanded ? "w-60" : "w-[68px]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm">
            P
          </span>
          <div
            className={cn(
              "min-w-0 overflow-hidden transition-all duration-200",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}
          >
            <p className="truncate text-[15px] font-semibold text-white tracking-tight">{clinicName}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.08]" />

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 py-4">
          {desktopNavItems.map((item) => (
            <NavLink
              key={item.href}
              end={item.end}
              to={item.href}
              className={({ isActive }) => desktopLinkClassName(isActive, isExpanded)}
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span
                className={cn(
                  "truncate transition-all duration-200 flex items-center gap-1.5",
                  isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.label}
                {item.href === "/inventory" && isExpanded && (
                  <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                    demo
                  </span>
                )}
              </span>
              {isExpanded && item.badge ? (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-sidebar-foreground">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mt-auto">
          <div className="mx-4 h-px bg-white/[0.08]" />
          <div className="p-3">
            {/* Settings link */}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  isExpanded ? "gap-3" : "justify-center",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-sidebar-foreground hover:bg-white/[0.06] hover:text-white",
                )
              }
              title={!isExpanded ? "Settings" : undefined}
            >
              <Settings className="h-[18px] w-[18px] shrink-0" />
              <span
                className={cn(
                  "truncate transition-all duration-200",
                  isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}
              >
                Settings
              </span>
            </NavLink>

            {/* User card */}
            <div
              className={cn(
                "mt-2 flex items-center rounded-lg bg-white/[0.05] transition-all duration-200",
                isExpanded ? "gap-3 px-3 py-3" : "justify-center py-3"
              )}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </span>
              {isExpanded && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{displayName}</p>
                    <p className="truncate text-[11px] text-sidebar-foreground/70">
                      {roleLabel(role)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Sign out"
                    className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(mobileNavItems.length + 1, 1)}, minmax(0, 1fr))`,
          }}
        >
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.href}
              end={item.end}
              to={item.href}
              className={({ isActive }) => mobileLinkClassName(isActive)}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.mobileLabel ?? item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) => mobileLinkClassName(isActive)}
          >
            <UserCircle className="h-[18px] w-[18px]" />
            <span>Profile</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
