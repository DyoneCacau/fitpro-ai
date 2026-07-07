import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ProfessionalSidebar } from "./ProfessionalSidebar";
import { useAuth } from "@/hooks/use-auth";
import {
  ProfessionalSidebarProvider,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  useProfessionalSidebar,
} from "@/hooks/use-professional-sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const isProfessional = role === "personal" || role === "admin";

  if (isProfessional) {
    return (
      <ProfessionalSidebarProvider>
        <ProfessionalAppLayout>{children}</ProfessionalAppLayout>
      </ProfessionalSidebarProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}

function ProfessionalAppLayout({ children }: { children: ReactNode }) {
  const { collapsed } = useProfessionalSidebar();

  return (
    <div className="min-h-screen bg-background">
      <ProfessionalSidebar />
      <div
        className={cn(
          "transition-[padding] duration-200 ease-out",
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        )}
      >
        <div className="mx-auto w-full max-w-6xl pb-24 md:pb-8">{children}</div>
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
