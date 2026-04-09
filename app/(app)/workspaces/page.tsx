"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDb } from "@/lib/firebase/client";
import { createBoard, createWorkspace } from "@/lib/firestore/boardActions";

type Workspace = {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
};

type Board = { id: string; workspaceId: string; title: string; sortOrder: number };

export default function WorkspacesPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("root");

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
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          parentId: d.data().parentId as string | null | undefined,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    const unsubB = onSnapshot(bq, (snap) => {
      setBoards(
        snap.docs.map((d) => ({
          id: d.id,
          workspaceId: d.data().workspaceId as string,
          title: d.data().title as string,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    return () => {
      unsubW();
      unsubB();
    };
  }, [user]);

  const groupedBoards = useMemo(() => {
    const map = new Map<string, Board[]>();
    for (const b of boards) {
      const arr = map.get(b.workspaceId) ?? [];
      arr.push(b);
      map.set(b.workspaceId, arr);
    }
    return map;
  }, [boards]);

  async function handleAddWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    const sortOrder =
      workspaces.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1;
    await createWorkspace({
      userId: user.uid,
      name,
      parentId: parentId === "root" ? null : parentId,
      sortOrder,
    });
    setName("");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">Workspaces</h1>
        <p className="text-sm text-zinc-600">
          כל תחום הוא Workspace. ניתן ליצור תת-תחום ו־Board תחת כל תחום.
        </p>
      </header>

      <form
        onSubmit={handleAddWorkspace}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם תחום / תת תחום"
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none sm:col-span-2"
        />
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
        >
          <option value="root">ללא הורה (ראשי)</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          הוסף Workspace
        </button>
      </form>

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div key={ws.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">{ws.name}</p>
                <p className="text-xs text-zinc-500">
                  {ws.parentId ? "תת-תחום" : "תחום ראשי"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!user) return;
                  const title = window.prompt("שם Board");
                  if (!title?.trim()) return;
                  const nextSort =
                    (groupedBoards.get(ws.id) ?? []).reduce(
                      (m, x) => Math.max(m, x.sortOrder),
                      -1,
                    ) + 1;
                  createBoard({
                    userId: user.uid,
                    workspaceId: ws.id,
                    title,
                    sortOrder: nextSort,
                  }).catch(console.error);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + Board
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              {(groupedBoards.get(ws.id) ?? []).map((board) => (
                <li key={board.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                  {board.title}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
