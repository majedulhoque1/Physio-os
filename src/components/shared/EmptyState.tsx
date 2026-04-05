import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  description: string;
  icon: LucideIcon;
  title: string;
}

export function EmptyState({ description, icon: Icon, title }: EmptyStateProps) {
  return (
    <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <div className="w-full rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card sm:p-12">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
