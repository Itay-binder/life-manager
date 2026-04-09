"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
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
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
    );
    const unsubW = onSnapshot(wq, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
        parentId: d.data().parentId as string | null | undefined,
        sortOrder: d.data().sortOrder as number,
      }));
      setWorkspaces(rows.sort((a, b) => a.sortOrder - b.sortOrder));
    });
    const unsubB = onSnapshot(bq, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        workspaceId: d.data().workspaceId as string,
        title: d.data().title as string,
        sortOrder: d.data().sortOrder as number,
      }));
      setBoards(rows.sort((a, b) => a.sortOrder - b.sortOrder));
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
    try {
      await createWorkspace({
        userId: user.uid,
        name,
        parentId: parentId === "root" ? null : parentId,
        sortOrder,
      });
      setName("");
      window.alert("Workspace נוצר בהצלחה");
    } catch (error) {
      console.error(error);
      window.alert("שגיאה ביצירת Workspace. בדוק Rules/Indexes.");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">
          Workspaces
        </h1>
        <p className="text-sm text-slate-600">
          כל תחום הוא Workspace. ניתן ליצור תת-תחום ו־Board תחת כל תחום.
        </p>
      </header>

      <form
        onSubmit={handleAddWorkspace}
        className="grid gap-3 rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-xl shadow-blue-950/5 sm:grid-cols-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם תחום / תת תחום"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring-2 sm:col-span-2"
        />
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring-2"
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
          className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          הוסף Workspace
        </button>
      </form>

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div key={ws.id} className="rounded-3xl border border-blue-100 bg-white/95 p-4 shadow-lg shadow-blue-950/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{ws.name}</p>
                <p className="text-xs text-slate-500">
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
                  })
                    .then(() => window.alert("Board נוצר בהצלחה"))
                    .catch((error) => {
                      console.error(error);
                      window.alert("שגיאה ביצירת Board. בדוק Rules/Indexes.");
                    });
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                + Board
              </button>
            </div>
            <ul className="mt-3 space-y-1">
              {(groupedBoards.get(ws.id) ?? []).map((board) => (
                <li key={board.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
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
