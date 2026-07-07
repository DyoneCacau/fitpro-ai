import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "fitpro-pro-sidebar-collapsed";

type ProfessionalSidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const ProfessionalSidebarContext = createContext<ProfessionalSidebarContextValue | null>(null);

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function ProfessionalSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <ProfessionalSidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </ProfessionalSidebarContext.Provider>
  );
}

export function useProfessionalSidebar() {
  const ctx = useContext(ProfessionalSidebarContext);
  if (!ctx) {
    throw new Error("useProfessionalSidebar must be used within ProfessionalSidebarProvider");
  }
  return ctx;
}

export const SIDEBAR_WIDTH_EXPANDED = "md:pl-60 lg:pl-64";
export const SIDEBAR_WIDTH_COLLAPSED = "md:pl-[4.5rem]";
