import type { ReactNode } from "react";
import { AnimeJobPoller } from "@/components/anime/anime-job-poller";
import { Sidebar } from "@/components/dashboard/sidebar";
import { HeaderUser } from "@/components/dashboard/user-card";
import { ThemeProvider } from "@/components/settings/theme-provider";
import { getCurrentUser } from "@/lib/current-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <ThemeProvider>
      <AnimeJobPoller />
      <main className="min-h-screen text-[var(--foreground)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row lg:items-stretch">
          <Sidebar user={user} />
          <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-4 flex justify-end">
              <HeaderUser user={user} />
            </div>
            {children}
          </section>
        </div>
      </main>
    </ThemeProvider>
  );
}
