"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type DomainRow = {
  id: string;
  name: string;
  sortOrder: number;
};

export default function DomainsPage() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const qy = query(
      collection(db, "domains"),
      where("userId", "==", user.uid),
      orderBy("sortOrder", "asc"),
    );
    return onSnapshot(qy, (snap) => {
      setDomains(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            name: x.name as string,
            sortOrder: x.sortOrder as number,
          };
        }),
      );
    });
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const nextOrder =
        domains.length === 0
          ? 0
          : Math.max(...domains.map((d) => d.sortOrder)) + 1;
      await addDoc(collection(getDb(), "domains"), {
        userId: user.uid,
        name: name.trim(),
        sortOrder: nextOrder,
        createdAt: serverTimestamp(),
      });
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">תחומים</h1>
        <p className="mt-1 text-sm text-zinc-600">
          תחומי ברירת המחדל נוצרים בכניסה ראשונה. אפשר להוסיף תחומים נוספים
          (למשל עסק או פרויקט).
        </p>
      </header>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">שם תחום חדש</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2"
            placeholder="למשל ליפטיגו"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="h-10 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          הוסף
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {domains.map((d, i) => (
          <li
            key={d.id}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-medium text-zinc-900">{d.name}</span>
            <span className="text-xs tabular-nums text-zinc-400">{i + 1}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}