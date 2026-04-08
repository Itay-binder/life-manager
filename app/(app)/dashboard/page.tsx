"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { todayLocalYMD } from "@/lib/date/localDay";
import Link from "next/link";

type DomainRow = { id: string; name: string };
type ItemRow = {
  id: string;
  kind: "task" | "habit";
  status: string;
  lastCompletedDate?: string | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const dq = query(
      collection(db, "domains"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const unsubD = onSnapshot(dq, (snap) => {
      setDomains(snap.docs.map((d) => ({ id: d.id, name: d.data().name as string })));
    });
    const iq = query(
      collection(db, "items"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubI = onSnapshot(iq, (snap) => {
      setItems(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            kind: x.kind as "task" | "habit",
            status: x.status as string,
            lastCompletedDate: x.lastCompletedDate as string | null | undefined,
          };
        }),
      );
    });
    return () => {
      unsubD();
      unsubI();
    };
  }, [user]);

  const today = todayLocalYMD();
  const openTasks = items.filter((i) => i.kind === "task" && i.status === "open");
  const habitsDoneToday = items.filter(
    (i) => i.kind === "habit" && i.lastCompletedDate === today,
  );
  const totalHabits = items.filter((i) => i.kind === "habit").length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">דשבורד</h1>
        <p className="mt-1 text-sm text-zinc-600">
          סיכום מהיר לפני שמתחילים את היום.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">תחומים</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {domains.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">משימות פתוחות</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {openTasks.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">הרגלים — היום</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {totalHabits === 0
              ? "—"
              : `${habitsDoneToday.length}/${totalHabits}`}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/tasks"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          ניהול משימות והרגלים
        </Link>
        <Link
          href="/domains"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          תחומים
        </Link>
      </section>
    </div>
  );
}
