import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeProvider } from "@/components/settings/theme-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
    <main className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row lg:items-stretch">
        <Sidebar />
        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</section>
      </div>
    </main>
    </ThemeProvider>
  );
}

