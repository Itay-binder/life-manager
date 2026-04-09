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
import { DEFAULT_WORKSPACE_NAMES } from "@/lib/domains/defaults";
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

const DEFAULT_WORKSPACE_ORDER: Map<string, number> = new Map(
  DEFAULT_WORKSPACE_NAMES.map((name, index) => [name, index]),
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [editingName, setEditingName] = useState(user?.displayName ?? "");
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setEditingName(user?.displayName ?? "");
  }, [user]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (event: MouseEvent) => {
      const next = window.innerWidth - event.clientX;
      const clamped = Math.max(260, Math.min(520, next));
      setSidebarWidth(clamped);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

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
        .sort((a, b) => {
          if (parentId === null) {
            const ai = DEFAULT_WORKSPACE_ORDER.get(a.name);
            const bi = DEFAULT_WORKSPACE_ORDER.get(b.name);
            if (ai != null && bi != null) return ai - bi;
            if (ai != null) return -1;
            if (bi != null) return 1;
          }
          return a.sortOrder - b.sortOrder;
        })
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
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700"
          style={{ paddingInlineStart: `${8 + node.depth * 12}px` }}
        >
          <span className="text-base leading-none">📁</span>
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
                className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm transition ${
                  pathname === `/boards/${board.id}`
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-xs">▦</span>
                  {board.title}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuBoardId(board.id)}
                className="rounded-lg px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleCreateBoard(node.id).catch(console.error)}
          className="mt-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          style={{ marginInlineStart: `${20 + node.depth * 12}px` }}
        >
          + Board חדש
        </button>
        {node.boards.length === 0 ? (
          <div
            className="mt-1 text-xs text-slate-400"
            style={{ marginInlineStart: `${24 + node.depth * 12}px` }}
          >
            אין Boards כרגע
          </div>
        ) : null}
        {node.children.map((child) => (
          <WorkspaceTree key={child.id} node={child} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 bg-transparent">
      {!sidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          className="fixed right-3 top-3 z-20 rounded-xl border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur hover:bg-white"
          title="מזער תפריט"
        >
          הסתר תפריט
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed right-3 top-3 z-20 rounded-xl border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur hover:bg-white"
          title="פתח תפריט"
        >
          פתח תפריט
        </button>
      )}
      <aside
        className={`sticky top-0 h-screen border-l border-blue-100 bg-white/95 p-3 shadow-2xl shadow-blue-950/5 backdrop-blur transition-[width,padding] duration-200 ${
          sidebarCollapsed ? "w-0 overflow-hidden p-0" : ""
        }`}
        style={sidebarCollapsed ? undefined : { width: `${sidebarWidth}px` }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="bg-gradient-to-l from-blue-600 to-violet-600 bg-clip-text text-sm font-extrabold tracking-tight text-transparent">
            Life Manager
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingName(user?.displayName ?? "");
              setShowProfile((x) => !x);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-semibold text-white shadow-md"
            title="פרופיל"
          >
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </button>
        </div>
        {showProfile ? (
          <div className="mb-3 space-y-2 rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/80 to-violet-50/70 p-3 shadow-sm">
            <p className="text-xs text-slate-500">{user?.email}</p>
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-2.5 py-1.5 text-sm outline-none ring-blue-200 focus:ring-2"
              placeholder="שם תצוגה"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleProfileSave().catch(console.error)}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-2.5 py-1 text-xs text-white shadow-sm"
              >
                שמירה
              </button>
              <button
                type="button"
                onClick={() => handleSignOut().catch(console.error)}
                className="rounded-lg border border-blue-100 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                התנתקות
              </button>
            </div>
          </div>
        ) : null}
        <nav className="mb-3 space-y-1.5">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                pathname === href
                  ? "bg-gradient-to-l from-blue-600 to-violet-600 text-white shadow-md"
                  : "text-slate-700 hover:bg-slate-100/80"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-blue-100 bg-white p-2.5 shadow-inner">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workspaces
          </p>
          {tree.map((node) => (
            <WorkspaceTree key={node.id} node={node} />
          ))}
        </div>
      </aside>
      {!sidebarCollapsed ? (
        <button
          type="button"
          onMouseDown={() => setIsResizing(true)}
          className="relative z-10 h-screen w-1 cursor-col-resize bg-transparent hover:bg-blue-300/60"
          title="גרור לשינוי רוחב"
        />
      ) : null}
      <main className="min-h-screen flex-1 p-6">{children}</main>

      {menuBoardId ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px]"
          onClick={() => setMenuBoardId(null)}
        >
          <div
            className="absolute left-4 top-24 w-64 rounded-2xl border border-blue-100 bg-white p-2.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 px-2 text-xs text-slate-400">הגדרות Board</p>
            <button
              type="button"
              className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
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
                className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
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
              className="w-full rounded-xl px-2 py-1.5 text-right text-sm text-red-600 hover:bg-red-50"
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
