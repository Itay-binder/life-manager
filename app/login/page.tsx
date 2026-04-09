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
        <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-xl font-extrabold text-transparent">
          הגדרת Firebase
        </h1>
        <p className="text-sm text-slate-600">
          צור קובץ <code className="rounded bg-zinc-200 px-1">.env.local</code>{" "}
          לפי <code className="rounded bg-zinc-200 px-1">.env.example</code> והרץ
          מחדש את השרת.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-2xl shadow-blue-950/10">
        <div>
          <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">
            Life Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600">
          התחבר כדי לנהל תחומים, משימות והרגלים.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => signInWithGoogle().catch(console.error)}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "טוען…" : "המשך עם Google"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          בנייד, אם החלון נחסם — ננסה בהמשך זרם עם הפניה (
          <code className="rounded bg-slate-200 px-1">redirect</code>) במקום חלון
          קופץ.
        </p>
      </div>
    </div>
  );
}
