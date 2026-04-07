import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { ClinicStaffRole } from "@/types";

interface HeaderProps {
  breadcrumbs: string[];
  title: string;
}

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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left — page title */}
      <div className="min-w-0">
        <p className="hidden text-xs font-medium text-muted-foreground sm:block">
          {breadcrumbs.join(" / ")}
        </p>
        <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      {/* Right — profile chip */}
      <Link
        to="/settings"
        aria-label="Profile and settings"
        className="flex items-center gap-2.5 rounded-full border border-border bg-white py-1 pl-1 pr-3.5 transition-all hover:border-primary/30 hover:shadow-sm"
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials || "?"}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-medium text-foreground leading-tight">
            {displayName}
          </span>
          {role ? (
            <span className="block truncate text-[11px] text-muted-foreground leading-tight">
              {roleLabel(role)}
            </span>
          ) : null}
        </span>
      </Link>
    </header>
  );
}
