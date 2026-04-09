"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
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
      orderBy("sortOrder", "asc"),
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
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
        <h1 className="text-2xl font-semibold text-zinc-900">Boards</h1>
        <p className="text-sm text-zinc-600">
          רשימת כל ה־Boards מכל התחומים.
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <ul className="space-y-2">
          {boards.map((board) => (
            <li
              key={board.id}
              className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2"
            >
              <div>
                <p className="font-medium text-zinc-900">{board.title}</p>
                <p className="text-xs text-zinc-500">
                  {workspaceMap.get(board.workspaceId) ?? "ללא תחום"} ·{" "}
                  {board.privacy}
                </p>
              </div>
              <Link
                href={`/boards/${board.id}`}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white"
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
