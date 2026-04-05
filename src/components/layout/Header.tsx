import { Bell, ChevronRight } from "lucide-react";

interface HeaderProps {
  breadcrumbs: string[];
  title: string;
}

export function Header({ breadcrumbs, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-6">
      <div className="min-w-0">
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
              <span className="truncate">{crumb}</span>
            </span>
          ))}
        </div>
        <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="View notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>

        <button
          type="button"
          aria-label="Open account menu"
          className="inline-flex items-center gap-3 rounded-full border border-border bg-surface px-1.5 py-1 pr-3 shadow-card transition-colors hover:border-primary/30"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            DT
          </span>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            Dr. Tania
          </span>
        </button>
      </div>
    </header>
  );
}
