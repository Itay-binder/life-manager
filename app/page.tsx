"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (loading || !configured) return;
    if (user) router.replace("/dashboard");
    else router.replace("/login");
  }, [user, loading, configured, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-600">
      טוען…
    </div>
  );
}
