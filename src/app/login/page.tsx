import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-[var(--cadet-gray)]">
          加载中...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
