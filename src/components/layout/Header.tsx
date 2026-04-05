import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ClinicStaffRole } from "@/types";

interface HeaderProps {
  breadcrumbs: string[];
  title: string;
}

const todayLabel = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
}).format(new Date());

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

export function Header({ breadcrumbs, title }: HeaderProps) {
  const { displayName, role } = useAuth();
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6">
      {/* Left — date + page title */}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          <span className="sm:hidden">{todayLabel}</span>
          <span className="hidden sm:inline">
            {breadcrumbs.join(" › ")}
          </span>
        </p>
        <h1 className="truncate text-lg font-semibold leading-tight text-foreground">
          {title}
        </h1>
      </div>

      {/* Right — bell + profile/settings */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Bell — desktop only, non-functional placeholder */}
        <span
          aria-label="Notifications coming soon"
          className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground"
        >
          <Bell className="h-4 w-4" />
        </span>

        {/* Profile + Settings button */}
        <Link
          to="/settings"
          aria-label="Profile and settings"
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 transition-colors hover:border-primary/30 hover:bg-background"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials || "?"}
          </span>

          {/* Name + role — sm+ only */}
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-medium text-foreground leading-tight">
              {displayName}
            </span>
            {role ? (
              <span className="block truncate text-xs text-muted-foreground leading-tight">
                {roleLabel(role)}
              </span>
            ) : null}
          </span>

        </Link>
      </div>
    </header>
  );
}
