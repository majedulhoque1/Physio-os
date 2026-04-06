import { Activity, LogOut, Settings, UserCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
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
    "group flex items-center rounded-r-lg border-l-2 px-3 py-3 text-sm font-medium transition-all duration-200",
    isExpanded ? "gap-3 px-4" : "gap-0 justify-center",
    isActive
      ? "border-primary bg-sidebar-active text-white"
      : "border-transparent text-sidebar-foreground hover:bg-sidebar-active hover:text-white",
  );
}

function mobileLinkClassName(isActive: boolean) {
  return cn(
    "flex flex-col items-center gap-1 border-t-2 px-2 py-3 text-[11px] font-medium transition-colors",
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-muted-foreground",
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

export function Sidebar() {
  const { clinic, displayName, role, signOut, user } = useAuth();
  if (!user) return null;
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
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
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground transition-all duration-200 lg:flex",
          isExpanded ? "w-60" : "w-20"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-5 transition-all duration-200">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Activity className="h-5 w-5" />
          </span>
          {isExpanded && (
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">{clinicName}</p>
              <p className="text-xs text-sidebar-foreground/80">Clinic operations</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-0 py-4">
          {desktopNavItems.map((item) => (
            <NavLink
              key={item.href}
              end={item.end}
              to={item.href}
              className={({ isActive }) => desktopLinkClassName(isActive, isExpanded)}
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isExpanded && (
                <>
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-sidebar-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "mb-3 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isExpanded ? "gap-2" : "justify-center",
                isActive
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-active hover:text-white",
              )
            }
            title={!isExpanded ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {isExpanded && "Settings"}
          </NavLink>

          {isExpanded && (
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">
                  {role ? `${roleLabel(role)} · ${user?.email ?? ""}` : user?.email ?? ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="shrink-0 rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(mobileNavItems.length + 2, 1)}, minmax(0, 1fr))`,
          }}
        >
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.href}
              end={item.end}
              to={item.href}
              className={({ isActive }) => mobileLinkClassName(isActive)}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.mobileLabel ?? item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) => mobileLinkClassName(isActive)}
          >
            <UserCircle className="h-4 w-4" />
            <span>Profile</span>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 border-t-2 border-transparent px-2 py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
