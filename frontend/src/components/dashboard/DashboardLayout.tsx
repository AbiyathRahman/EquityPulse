import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}

export const DashboardLayout = ({
  children,
  userEmail,
  userName,
}: DashboardLayoutProps) => (
  <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <div className="flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav userEmail={userEmail} userName={userName} />
        <main className="flex-1 space-y-8 bg-slate-50/90 px-6 py-8 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  </div>
);
