import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { ItemKind } from "@/lib/firestore/types";
import { todayLocalYMD, yesterdayLocalYMD } from "@/lib/date/localDay";

const itemsCol = "items";

export async function createItem(params: {
  userId: string;
  domainId: string;
  kind: ItemKind;
  title: string;
  estimateMinutes?: number | null;
}): Promise<void> {
  const db = getDb();
  const base = {
    userId: params.userId,
    domainId: params.domainId,
    kind: params.kind,
    title: params.title.trim(),
    estimateMinutes: params.estimateMinutes ?? null,
    status: "open" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.kind === "task") {
    await addDoc(collection(db, itemsCol), {
      ...base,
      completedAt: null,
    });
    return;
  }

  await addDoc(collection(db, itemsCol), {
    ...base,
    lastCompletedDate: null,
    streakCurrent: 0,
    streakBest: 0,
  });
}

export async function completeTask(itemId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, itemsCol, itemId), {
    status: "done",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function reopenTask(itemId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, itemsCol, itemId), {
    status: "open",
    completedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function markHabitToday(
  itemId: string,
  current: {
    lastCompletedDate: string | null | undefined;
    streakCurrent: number | null | undefined;
    streakBest: number | null | undefined;
  },
): Promise<void> {
  const today = todayLocalYMD();
  if (current.lastCompletedDate === today) return;

  const db = getDb();
  const yesterday = yesterdayLocalYMD();
  let streak: number;
  if (!current.lastCompletedDate) {
    streak = 1;
  } else if (current.lastCompletedDate === yesterday) {
    streak = (current.streakCurrent ?? 0) + 1;
  } else {
    streak = 1;
  }

  const best = Math.max(streak, current.streakBest ?? 0);

  await updateDoc(doc(db, itemsCol, itemId), {
    lastCompletedDate: today,
    streakCurrent: streak,
    streakBest: best,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  await deleteDoc(doc(getDb(), itemsCol, itemId));
}
