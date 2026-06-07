import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="bg-gradient-hero px-5 pt-12 pb-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          {subtitle && (
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {subtitle}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}
