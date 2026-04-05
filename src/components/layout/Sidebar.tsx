import { Activity, LogOut } from "lucide-react";
import { NavLink } from "react-router-dom";
import { desktopNavItems, mobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function desktopLinkClassName(isActive: boolean) {
  return cn(
    "group flex items-center gap-3 rounded-r-lg border-l-2 px-4 py-3 text-sm font-medium transition-colors",
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

export function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-white">Physio OS</p>
            <p className="text-xs text-sidebar-foreground/80">Clinic operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-0 py-4">
          {desktopNavItems.map((item) => (
            <NavLink
              key={item.href}
              end={item.end}
              to={item.href}
              className={({ isActive }) => desktopLinkClassName(isActive)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-sidebar-foreground">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="m-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              TH
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Dr. Tanvir Hasan</p>
              <p className="truncate text-xs text-sidebar-foreground">Clinic Owner</p>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
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
        </div>
      </nav>
    </>
  );
}
