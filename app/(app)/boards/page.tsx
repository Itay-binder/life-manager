"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDb } from "@/lib/firebase/client";

type Board = {
  id: string;
  workspaceId: string;
  title: string;
  privacy: "private" | "workspace" | "public";
};

type Workspace = { id: string; name: string };

export default function BoardsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const wq = query(
      collection(db, "workspaces"),
      where("userId", "==", user.uid),
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
    );
    const unsubW = onSnapshot(wq, (snap) => {
      setWorkspaces(
        snap.docs.map((d) => ({ id: d.id, name: d.data().name as string })),
      );
    });
    const unsubB = onSnapshot(bq, (snap) => {
      setBoards(
        snap.docs.map((d) => ({
          id: d.id,
          workspaceId: d.data().workspaceId as string,
          title: d.data().title as string,
          privacy: d.data().privacy as "private" | "workspace" | "public",
        })),
      );
    });
    return () => {
      unsubW();
      unsubB();
    };
  }, [user]);

  const workspaceMap = useMemo(
    () => new Map(workspaces.map((w) => [w.id, w.name])),
    [workspaces],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">
          Boards
        </h1>
        <p className="text-sm text-slate-600">
          רשימת כל ה־Boards מכל התחומים.
        </p>
      </header>

      <div className="rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-xl shadow-blue-950/5">
        <ul className="space-y-2">
          {boards.map((board) => (
            <li
              key={board.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div>
                <p className="font-semibold text-slate-900">{board.title}</p>
                <p className="text-xs text-slate-500">
                  {workspaceMap.get(board.workspaceId) ?? "ללא תחום"} ·{" "}
                  {board.privacy}
                </p>
              </div>
              <Link
                href={`/boards/${board.id}`}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                פתח Board
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
