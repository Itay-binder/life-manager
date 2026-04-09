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
import Link from "next/link";

type WorkspaceRow = { id: string; name: string };
type BoardRow = { id: string; title: string };
type ItemRow = { id: string; title: string };

export default function DashboardPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const wq = query(
      collection(db, "workspaces"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const iq = query(
      collection(db, "boardItems"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubW = onSnapshot(wq, (snap) => {
      setWorkspaces(
        snap.docs.map((d) => ({ id: d.id, name: d.data().name as string })),
      );
    });
    const unsubB = onSnapshot(bq, (snap) => {
      setBoards(
        snap.docs.map((d) => ({ id: d.id, title: d.data().title as string })),
      );
    });
    const unsubI = onSnapshot(iq, (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, title: d.data().title as string })),
      );
    });
    return () => {
      unsubW();
      unsubB();
      unsubI();
    };
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">
          דשבורד
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          סיכום מהיר לפני שמתחילים את היום.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-blue-100 bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Workspaces</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">
            {workspaces.length}
          </p>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Boards</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">
            {boards.length}
          </p>
        </div>
        <div className="rounded-3xl border border-blue-100 bg-white/95 p-5 shadow-xl shadow-blue-950/5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Items</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">
            {items.length}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/boards"
          className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          מעבר ל־Boards
        </Link>
        <Link
          href="/workspaces"
          className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          ניהול Workspaces
        </Link>
      </section>
    </div>
  );
}
