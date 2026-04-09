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
        <h1 className="text-2xl font-semibold text-zinc-900">דשבורד</h1>
        <p className="mt-1 text-sm text-zinc-600">
          סיכום מהיר לפני שמתחילים את היום.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Workspaces</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {workspaces.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Boards</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {boards.length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Items</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
            {items.length}
          </p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/boards"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          מעבר ל־Boards
        </Link>
        <Link
          href="/workspaces"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          ניהול Workspaces
        </Link>
      </section>
    </div>
  );
}
