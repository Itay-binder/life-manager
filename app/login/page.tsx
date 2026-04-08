"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (!loading && configured && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, configured, router]);

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    router.replace("/dashboard");
  }

  if (!isFirebaseConfigured()) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-3 px-6 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">הגדרת Firebase</h1>
        <p className="text-sm text-zinc-600">
          צור קובץ <code className="rounded bg-zinc-200 px-1">.env.local</code>{" "}
          לפי <code className="rounded bg-zinc-200 px-1">.env.example</code> והרץ
          מחדש את השרת.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Life Manager</h1>
        <p className="mt-1 text-sm text-zinc-600">
          התחבר כדי לנהל תחומים, משימות והרגלים.
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => signInWithGoogle().catch(console.error)}
        className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {loading ? "טוען…" : "המשך עם Google"}
      </button>
      <p className="text-xs text-zinc-500">
        בנייד, אם החלון נחסם — ננסה בהמשך זרם עם הפניה (
        <code className="rounded bg-zinc-200 px-1">redirect</code>) במקום חלון
        קופץ.
      </p>
    </div>
  );
}
