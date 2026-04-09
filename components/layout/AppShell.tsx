"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  collection,
  onSnapshot,
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
  deleteWorkspace,
  moveWorkspace,
  recolorWorkspace,
  renameBoard,
  renameWorkspace,
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
  color?: string;
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
  const [menuWorkspaceId, setMenuWorkspaceId] = useState<string | null>(null);
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
    );
    const bq = query(
      collection(db, "boards"),
      where("userId", "==", user.uid),
    );
    const unsubWorkspaces = onSnapshot(
      uq,
      (snap) => {
        setWorkspaces(
          snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name as string,
            parentId: d.data().parentId as string | null | undefined,
            color: d.data().color as string | undefined,
            sortOrder: d.data().sortOrder as number,
          })),
        );
      },
      (error) => {
        console.error("workspaces snapshot error", error);
      },
    );
    const unsubBoards = onSnapshot(
      bq,
      (snap) => {
        setBoards(
          snap.docs.map((d) => ({
            id: d.id,
            workspaceId: d.data().workspaceId as string,
            title: d.data().title as string,
            privacy: d.data().privacy as BoardPrivacy,
            sortOrder: d.data().sortOrder as number,
          })),
        );
      },
      (error) => {
        console.error("boards snapshot error", error);
      },
    );
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
    try {
      await createBoard({ userId: user.uid, workspaceId, title, sortOrder });
    } catch (error) {
      console.error(error);
      window.alert("שגיאה ביצירת Board. בדוק Rules/Indexes בפיירסטור.");
    }
  }

  async function handleWorkspaceMenuAction(action: "rename" | "color" | "move" | "newBoard" | "delete", workspaceId: string) {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace || !user) return;

    if (action === "rename") {
      const name = window.prompt("שם חדש לתיקייה", workspace.name);
      if (!name?.trim()) return;
      await renameWorkspace(workspaceId, name);
      return;
    }

    if (action === "color") {
      const options = ["slate", "blue", "violet", "emerald", "amber", "rose"];
      const value = window.prompt(
        `בחר צבע לתיקייה: ${options.join(", ")}`,
        workspace.color ?? "slate",
      );
      if (!value?.trim()) return;
      await recolorWorkspace(workspaceId, value.trim().toLowerCase());
      return;
    }

    if (action === "move") {
      const candidates = workspaces.filter((w) => w.id !== workspaceId);
      const optionsText =
        "0 = שורש (ללא הורה)\n" +
        candidates.map((w, i) => `${i + 1} = ${w.name}`).join("\n");
      const pick = window.prompt(
        `העבר לתיקייה אחרת:\n${optionsText}`,
        "0",
      );
      if (pick == null) return;
      const idx = Number(pick);
      if (Number.isNaN(idx)) return;
      if (idx === 0) {
        await moveWorkspace(workspaceId, null);
        return;
      }
      const selected = candidates[idx - 1];
      if (!selected) return;
      await moveWorkspace(workspaceId, selected.id);
      return;
    }

    if (action === "newBoard") {
      await handleCreateBoard(workspaceId);
      return;
    }

    const hasBoards = boards.some((b) => b.workspaceId === workspaceId);
    const hasChildren = workspaces.some((w) => w.parentId === workspaceId);
    if (hasBoards || hasChildren) {
      window.alert("לא ניתן למחוק תיקייה עם Boards או תתי-תיקיות. הזז/מחק אותם קודם.");
      return;
    }
    const ok1 = window.confirm(`למחוק את התיקייה "${workspace.name}"?`);
    if (!ok1) return;
    const ok2 = window.confirm("אישור סופי: המחיקה בלתי הפיכה. להמשיך?");
    if (!ok2) return;
    await deleteWorkspace(workspaceId);
  }

  function workspaceColorClass(color?: string): string {
    switch (color) {
      case "blue":
        return "bg-blue-500";
      case "violet":
        return "bg-violet-500";
      case "emerald":
        return "bg-emerald-500";
      case "amber":
        return "bg-amber-500";
      case "rose":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  }

  function WorkspaceTree({
    node,
  }: {
    node: WorkspaceTreeNode;
  }) {
    return (
      <div className="mt-2">
        <div
          className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm font-semibold text-slate-100"
          style={{ paddingInlineStart: `${8 + node.depth * 12}px` }}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuWorkspaceId(node.id);
          }}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${workspaceColorClass(node.color)}`} />
            <span className="text-base leading-none">📁</span>
            <span className="truncate">{node.name}</span>
          </span>
          <button
            type="button"
            onClick={() => setMenuWorkspaceId(node.id)}
            className="rounded-lg px-1.5 py-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
            title="אפשרויות תיקייה"
          >
            ⋯
          </button>
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
                    ? "bg-cyan-500/20 text-cyan-100 shadow-sm"
                    : "text-slate-200 hover:bg-white/10"
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
                className="rounded-lg px-1.5 py-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleCreateBoard(node.id).catch(console.error)}
          className="mt-1 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
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
        className={`sticky top-0 h-screen border-l border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-3 text-slate-100 shadow-2xl shadow-indigo-950/40 backdrop-blur transition-[width,padding] duration-200 ${
          sidebarCollapsed ? "w-0 overflow-hidden p-0" : ""
        }`}
        style={sidebarCollapsed ? undefined : { width: `${sidebarWidth}px` }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="bg-gradient-to-l from-cyan-300 to-violet-300 bg-clip-text text-sm font-extrabold tracking-tight text-transparent">
            Life Manager
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingName(user?.displayName ?? "");
              setShowProfile((x) => !x);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-semibold text-white shadow-md"
            title="פרופיל"
          >
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </button>
        </div>
        {showProfile ? (
          <div className="mb-3 space-y-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 shadow-sm">
            <p className="text-xs text-slate-300">{user?.email}</p>
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none ring-cyan-300 focus:ring-2"
              placeholder="שם תצוגה"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleProfileSave().catch(console.error)}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 px-2.5 py-1 text-xs text-white shadow-sm"
              >
                שמירה
              </button>
              <button
                type="button"
                onClick={() => handleSignOut().catch(console.error)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
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
                  ? "bg-gradient-to-l from-cyan-500 to-violet-500 text-white shadow-md"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/50 p-2.5 shadow-inner">
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

      {menuWorkspaceId ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px]"
          onClick={() => setMenuWorkspaceId(null)}
        >
          <div
            className="absolute left-72 top-24 w-72 rounded-2xl border border-blue-100 bg-white p-2.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 px-2 text-xs text-slate-400">הגדרות תיקייה</p>
            <button
              type="button"
              className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
              onClick={() => {
                handleWorkspaceMenuAction("rename", menuWorkspaceId).catch(console.error);
                setMenuWorkspaceId(null);
              }}
            >
              שינוי שם
            </button>
            <button
              type="button"
              className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
              onClick={() => {
                handleWorkspaceMenuAction("color", menuWorkspaceId).catch(console.error);
                setMenuWorkspaceId(null);
              }}
            >
              שינוי צבע
            </button>
            <button
              type="button"
              className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
              onClick={() => {
                handleWorkspaceMenuAction("move", menuWorkspaceId).catch(console.error);
                setMenuWorkspaceId(null);
              }}
            >
              העבר לתיקייה אחרת
            </button>
            <button
              type="button"
              className="mb-1 w-full rounded-xl px-2 py-1.5 text-right text-sm hover:bg-slate-100"
              onClick={() => {
                handleWorkspaceMenuAction("newBoard", menuWorkspaceId).catch(console.error);
                setMenuWorkspaceId(null);
              }}
            >
              הוסף Board חדש
            </button>
            <button
              type="button"
              className="w-full rounded-xl px-2 py-1.5 text-right text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
                handleWorkspaceMenuAction("delete", menuWorkspaceId).catch(console.error);
                setMenuWorkspaceId(null);
              }}
            >
              מחיקת תיקייה
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
