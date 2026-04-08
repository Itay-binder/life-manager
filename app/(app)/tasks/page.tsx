"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  completeTask,
  createItem,
  markHabitToday,
  reopenTask,
} from "@/lib/firestore/itemActions";
import type { ItemKind } from "@/lib/firestore/types";
import { todayLocalYMD } from "@/lib/date/localDay";

type DomainRow = { id: string; name: string };
type ItemRow = {
  id: string;
  domainId: string;
  kind: ItemKind;
  title: string;
  status: string;
  estimateMinutes?: number | null;
  lastCompletedDate?: string | null;
  streakCurrent?: number;
  streakBest?: number;
};

const tabs = [
  { id: "all" as const, label: "הכל" },
  { id: "task" as const, label: "משימות" },
  { id: "habit" as const, label: "הרגלים" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [filter, setFilter] = useState<(typeof tabs)[number]["id"]>("all");
  const [domainId, setDomainId] = useState("");
  const [kind, setKind] = useState<ItemKind>("task");
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const dq = query(
      collection(db, "domains"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    const unsubD = onSnapshot(dq, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }));
      setDomains(rows);
      setDomainId((prev) => {
        if (prev && rows.some((r) => r.id === prev)) return prev;
        return rows[0]?.id ?? "";
      });
    });
    const iq = query(
      collection(db, "items"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );
    const unsubI = onSnapshot(iq, (snap) => {
      setItems(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            domainId: x.domainId as string,
            kind: x.kind as ItemKind,
            title: x.title as string,
            status: x.status as string,
            estimateMinutes: x.estimateMinutes as number | null | undefined,
            lastCompletedDate: x.lastCompletedDate as string | null | undefined,
            streakCurrent: x.streakCurrent as number | undefined,
            streakBest: x.streakBest as number | undefined,
          };
        }),
      );
    });
    return () => {
      unsubD();
      unsubI();
    };
  }, [user]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ItemRow[]>();
    for (const it of visibleItems) {
      const list = map.get(it.domainId) ?? [];
      list.push(it);
      map.set(it.domainId, list);
    }
    return domains
      .map((d) => ({ domain: d, items: map.get(d.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [visibleItems, domains]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !domainId || !title.trim()) return;
    setBusy(true);
    try {
      const minutes = estimate.trim() === "" ? null : Number(estimate);
      await createItem({
        userId: user.uid,
        domainId,
        kind,
        title: title.trim(),
        estimateMinutes:
          minutes !== null && !Number.isNaN(minutes) ? minutes : null,
      });
      setTitle("");
      setEstimate("");
    } finally {
      setBusy(false);
    }
  }

  const today = todayLocalYMD();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">
          משימות והרגלים
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          משימה חד-פעמית לעומת הרגל יומי עם סטרייק.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              filter === t.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-200/80 text-zinc-800 hover:bg-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">תחום</span>
            <select
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            >
              {domains.length === 0 ? (
                <option value="">אין תחומים עדיין</option>
              ) : (
                domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">סוג</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ItemKind)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            >
              <option value="task">משימה חד-פעמית</option>
              <option value="habit">הרגל חוזר</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">כותרת</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            placeholder="מה עושים?"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">
            אסטימציית זמן (דקות, אופציונלי)
          </span>
          <input
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            inputMode="numeric"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            placeholder="למשל 25"
          />
        </label>
        <button
          type="submit"
          disabled={
            busy || !domainId || !title.trim() || domains.length === 0
          }
          className="h-10 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? "שומר…" : "הוסף"}
        </button>
      </form>

      <section className="flex flex-col gap-6">
        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500">אין פריטים להצגה במסנן הנוכחי.</p>
        ) : (
          grouped.map(({ domain, items: list }) => (
            <div key={domain.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-zinc-800">
                {domain.name}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {it.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>
                          {it.kind === "task" ? "משימה" : "הרגל"}
                        </span>
                        {it.estimateMinutes != null ? (
                          <span>~{it.estimateMinutes} דק׳</span>
                        ) : null}
                        {it.kind === "habit" ? (
                          <span>
                            סטרייק: {it.streakCurrent ?? 0}
                            {it.lastCompletedDate === today
                              ? " · נעשה היום"
                              : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {it.kind === "task" ? (
                        it.status === "open" ? (
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                            onClick={() => completeTask(it.id).catch(console.error)}
                          >
                            סמן בוצע
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            onClick={() => reopenTask(it.id).catch(console.error)}
                          >
                            החזר לפתוח
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={it.lastCompletedDate === today}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() =>
                            markHabitToday(it.id, {
                              lastCompletedDate: it.lastCompletedDate,
                              streakCurrent: it.streakCurrent,
                              streakBest: it.streakBest,
                            }).catch(console.error)
                          }
                        >
                          {it.lastCompletedDate === today
                            ? "בוצע היום"
                            : "סמן להיום"}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
