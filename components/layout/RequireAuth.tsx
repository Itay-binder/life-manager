"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login");
    }
  }, [user, loading, configured, router]);

  if (!configured) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-zinc-900">חסרה הגדרת Firebase</p>
        <p className="max-w-sm text-xs text-zinc-600">
          העתק את `.env.example` ל־`.env.local` והדבק את המפתחות מקונסולת Firebase.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-600">
        טוען…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-600">
        מעביר להתחברות…
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
