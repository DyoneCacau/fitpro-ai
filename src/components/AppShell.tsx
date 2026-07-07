import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { ProfessionalSidebar } from "./ProfessionalSidebar";
import { useAuth } from "@/hooks/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const isProfessional = role === "personal" || role === "admin";

  if (isProfessional) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:flex md:items-stretch">
          <ProfessionalSidebar />
          <div className="flex-1 min-w-0">
            <div className="mx-auto w-full max-w-6xl pb-24 md:pb-8">{children}</div>
          </div>
        </div>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
