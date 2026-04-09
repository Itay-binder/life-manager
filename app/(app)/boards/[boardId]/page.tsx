"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDb } from "@/lib/firebase/client";
import {
  createBoardItem,
  createColumn,
  createGroup,
} from "@/lib/firestore/boardActions";

type Group = { id: string; title: string; sortOrder: number };
type Column = { id: string; title: string; key: string; sortOrder: number };
type Item = { id: string; groupId: string; title: string };
type Board = { id: string; title: string };

export default function BoardPage() {
  const { user } = useAuth();
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const [board, setBoard] = useState<Board | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user || !boardId) return;
    const db = getDb();
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
      where("__name__", "==", boardId),
    );
    const gq = query(
      collection(db, "boardGroups"),
      where("userId", "==", user.uid),
      where("boardId", "==", boardId),
      orderBy("sortOrder", "asc"),
    );
    const cq = query(
      collection(db, "boardColumns"),
      where("userId", "==", user.uid),
      where("boardId", "==", boardId),
      orderBy("sortOrder", "asc"),
    );
    const iq = query(
      collection(db, "boardItems"),
      where("userId", "==", user.uid),
      where("boardId", "==", boardId),
      orderBy("createdAt", "asc"),
    );

    const ub = onSnapshot(bq, (snap) => {
      const row = snap.docs[0];
      setBoard(row ? { id: row.id, title: row.data().title as string } : null);
    });
    const ug = onSnapshot(gq, (snap) => {
      setGroups(
        snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title as string,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    const uc = onSnapshot(cq, (snap) => {
      setColumns(
        snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title as string,
          key: d.data().key as string,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    const ui = onSnapshot(iq, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          groupId: d.data().groupId as string,
          title: d.data().title as string,
        })),
      );
    });

    return () => {
      ub();
      ug();
      uc();
      ui();
    };
  }, [user, boardId]);

  const itemsByGroup = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const item of items) {
      const arr = m.get(item.groupId) ?? [];
      arr.push(item);
      m.set(item.groupId, arr);
    }
    return m;
  }, [items]);

  if (!boardId) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {board?.title ?? "Board"}
          </h1>
          <p className="text-sm text-zinc-600">
            Groups + Items + Columns (אותן עמודות לכל קבוצה בלוח).
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (!user || !groups[0]) return;
              const title = window.prompt("שם משימה");
              if (!title?.trim()) return;
              createBoardItem({
                userId: user.uid,
                boardId,
                groupId: groups[0].id,
                title,
              }).catch(console.error);
            }}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            New Item
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user) return;
              const title = window.prompt("שם קבוצה חדשה");
              if (!title?.trim()) return;
              createGroup({
                userId: user.uid,
                boardId,
                title,
                sortOrder:
                  groups.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1,
              }).catch(console.error);
            }}
            className="ms-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm"
          >
            ▾ קבוצה
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-700">עמודות Board</p>
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
            onClick={() => {
              if (!user) return;
              const title = window.prompt("שם עמודה");
              if (!title?.trim()) return;
              const key = title.trim().replace(/\s+/g, "_").toLowerCase();
              createColumn({
                userId: user.uid,
                boardId,
                key,
                title,
                sortOrder:
                  columns.reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1,
              }).catch(console.error);
            }}
          >
            + הוסף עמודה
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {columns.map((col) => (
            <span
              key={col.id}
              className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
            >
              {col.title}
            </span>
          ))}
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.id} className="rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">{group.title}</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {(itemsByGroup.get(group.id) ?? []).map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm text-zinc-800">
                {item.title}
              </li>
            ))}
            <li className="px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700"
                onClick={() => {
                  if (!user) return;
                  const title = window.prompt("שם משימה");
                  if (!title?.trim()) return;
                  createBoardItem({
                    userId: user.uid,
                    boardId,
                    groupId: group.id,
                    title,
                  }).catch(console.error);
                }}
              >
                + הוסף Item
              </button>
            </li>
          </ul>
        </section>
      ))}
    </div>
  );
}
