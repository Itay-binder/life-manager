"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { signOut, updateProfile } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { getDb } from "@/lib/firebase/client";
import type { BoardPrivacy } from "@/lib/firestore/types";
import {
  createBoard,
  deleteBoard,
  renameBoard,
  setBoardPrivacy,
} from "@/lib/firestore/boardActions";

const nav = [
  { href: "/dashboard", label: "דשבורד" },
  { href: "/boards", label: "Boards" },
  { href: "/workspaces", label: "Workspaces" },
];

type WorkspaceRow = {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
};

type BoardRow = {
  id: string;
  workspaceId: string;
  title: string;
  privacy: BoardPrivacy;
  sortOrder: number;
};

type WorkspaceTreeNode = WorkspaceRow & {
  depth: number;
  boards: BoardRow[];
  children: WorkspaceTreeNode[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [editingName, setEditingName] = useState(user?.displayName ?? "");
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);

  useEffect(() => {
    setEditingName(user?.displayName ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const uq = query(
      collection(db, "workspaces"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const unsubWorkspaces = onSnapshot(uq, (snap) => {
      setWorkspaces(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          parentId: d.data().parentId as string | null | undefined,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    const unsubBoards = onSnapshot(bq, (snap) => {
      setBoards(
        snap.docs.map((d) => ({
          id: d.id,
          workspaceId: d.data().workspaceId as string,
          title: d.data().title as string,
          privacy: d.data().privacy as BoardPrivacy,
          sortOrder: d.data().sortOrder as number,
        })),
      );
    });
    return () => {
      unsubWorkspaces();
      unsubBoards();
    };
  }, [user]);

  const tree = useMemo(() => {
    const children = new Map<string | null, WorkspaceRow[]>();
    for (const w of workspaces) {
      const key = w.parentId ?? null;
      const arr = children.get(key) ?? [];
      arr.push(w);
      children.set(key, arr);
    }
    const build = (
      parentId: string | null,
      depth: number,
    ): WorkspaceTreeNode[] => {
      const rows = children.get(parentId) ?? [];
      return rows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ws) => ({
          ...ws,
          depth,
          boards: boards.filter((b) => b.workspaceId === ws.id),
          children: build(ws.id, depth + 1),
        }));
    };
    return build(null, 0);
  }, [workspaces, boards]);

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
  }

  async function handleProfileSave() {
    if (!user) return;
    await updateProfile(user, { displayName: editingName.trim() || null });
    await updateDoc(doc(getDb(), "users", user.uid), {
      displayName: editingName.trim() || null,
    });
    setShowProfile(false);
  }

  async function handleCreateBoard(workspaceId: string) {
    if (!user) return;
    const title = window.prompt("שם הלוח החדש");
    if (!title?.trim()) return;
    const sortOrder =
      boards
        .filter((b) => b.workspaceId === workspaceId)
        .reduce((m, x) => Math.max(m, x.sortOrder), -1) + 1;
    await createBoard({ userId: user.uid, workspaceId, title, sortOrder });
  }

  function WorkspaceTree({
    node,
  }: {
    node: WorkspaceTreeNode;
  }) {
    return (
      <div className="mt-2">
        <div
          className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-700"
          style={{ paddingInlineStart: `${8 + node.depth * 12}px` }}
        >
          {node.name}
        </div>
        <div className="mt-1 space-y-1">
          {node.boards.map((board) => (
            <div
              key={board.id}
              className="group flex items-center gap-1"
              style={{ paddingInlineStart: `${20 + node.depth * 12}px` }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuBoardId(board.id);
              }}
            >
              <Link
                href={`/boards/${board.id}`}
                className={`flex-1 rounded-md px-2 py-1 text-sm ${
                  pathname === `/boards/${board.id}`
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {board.title}
              </Link>
              <button
                type="button"
                onClick={() => setMenuBoardId(board.id)}
                className="rounded px-1 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleCreateBoard(node.id).catch(console.error)}
          className="mt-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
          style={{ marginInlineStart: `${20 + node.depth * 12}px` }}
        >
          + Board חדש
        </button>
        {node.children.map((child) => (
          <WorkspaceTree key={child.id} node={child} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <aside className="sticky top-0 h-screen w-72 border-l border-zinc-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">Life Manager</p>
          <button
            type="button"
            onClick={() => {
              setEditingName(user?.displayName ?? "");
              setShowProfile((x) => !x);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
            title="פרופיל"
          >
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </button>
        </div>
        {showProfile ? (
          <div className="mb-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <p className="text-xs text-zinc-500">{user?.email}</p>
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none"
              placeholder="שם תצוגה"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleProfileSave().catch(console.error)}
                className="rounded bg-zinc-900 px-2 py-1 text-xs text-white"
              >
                שמירה
              </button>
              <button
                type="button"
                onClick={() => handleSignOut().catch(console.error)}
                className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
              >
                התנתקות
              </button>
            </div>
          </div>
        ) : null}
        <nav className="mb-3 space-y-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-2 py-1.5 text-sm ${
                pathname === href
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="h-[calc(100vh-220px)] overflow-y-auto rounded-xl border border-zinc-200 p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Workspaces
          </p>
          {tree.map((node) => (
            <WorkspaceTree key={node.id} node={node} />
          ))}
        </div>
      </aside>
      <main className="min-h-screen flex-1 p-6">{children}</main>

      {menuBoardId ? (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setMenuBoardId(null)}
        >
          <div
            className="absolute left-4 top-24 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 px-2 text-xs text-zinc-400">הגדרות Board</p>
            <button
              type="button"
              className="mb-1 w-full rounded px-2 py-1 text-right text-sm hover:bg-zinc-100"
              onClick={async () => {
                const current = boards.find((x) => x.id === menuBoardId);
                const title = window.prompt("שם חדש ללוח", current?.title ?? "");
                if (title?.trim()) await renameBoard(menuBoardId, title);
                setMenuBoardId(null);
              }}
            >
              שינוי שם
            </button>
            {(["private", "workspace", "public"] as BoardPrivacy[]).map((p) => (
              <button
                key={p}
                type="button"
                className="mb-1 w-full rounded px-2 py-1 text-right text-sm hover:bg-zinc-100"
                onClick={() => {
                  setBoardPrivacy(menuBoardId, p).catch(console.error);
                  setMenuBoardId(null);
                }}
              >
                רמת שיתוף: {p === "private" ? "פרטי" : p === "workspace" ? "לצוות" : "ציבורי"}
              </button>
            ))}
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-right text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                deleteBoard(menuBoardId).catch(console.error);
                setMenuBoardId(null);
              }}
            >
              מחיקת לוח
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
