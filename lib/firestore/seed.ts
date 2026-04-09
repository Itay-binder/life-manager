import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
  collection,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { User } from "firebase/auth";
import { DEFAULT_WORKSPACE_NAMES } from "@/lib/domains/defaults";

const usersCol = "users";
const workspacesCol = "workspaces";
const boardsCol = "boards";

async function ensureDefaultWorkspaces(user: User): Promise<void> {
  const db = getDb();
  const existingSnap = await getDocs(
    query(
      collection(db, workspacesCol),
      where("userId", "==", user.uid),
      where("parentId", "==", null),
    ),
  );
  const existingNames = new Set(
    existingSnap.docs.map((d) => String(d.data().name ?? "").trim()),
  );
  const missing = DEFAULT_WORKSPACE_NAMES.filter((name) => !existingNames.has(name));
  if (missing.length === 0) return;

  const batch = writeBatch(db);
  let maxOrder = -1;
  for (const d of existingSnap.docs) {
    const value = d.data().sortOrder;
    if (typeof value === "number") maxOrder = Math.max(maxOrder, value);
  }

  missing.forEach((name, index) => {
    const workspaceRef = doc(collection(db, workspacesCol));
    batch.set(workspaceRef, {
      userId: user.uid,
      name,
      parentId: null,
      color: "slate",
      sortOrder: maxOrder + index + 1,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function seedUserIfNeeded(user: User): Promise<void> {
  const db = getDb();
  const userRef = doc(db, usersCol, user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      workspacesSeeded: false,
      createdAt: serverTimestamp(),
    });
  }

  const after = await getDoc(userRef);
  const data = after.data() as { workspacesSeeded?: boolean } | undefined;
  if (data?.workspacesSeeded) {
    await ensureDefaultWorkspaces(user);
    return;
  }

  const batch = writeBatch(db);
  DEFAULT_WORKSPACE_NAMES.forEach((name, index) => {
    const workspaceRef = doc(collection(db, workspacesCol));
    const boardRef = doc(collection(db, boardsCol));
    batch.set(workspaceRef, {
      userId: user.uid,
      name,
      parentId: null,
      color: "slate",
      sortOrder: index,
      createdAt: serverTimestamp(),
    });
    batch.set(boardRef, {
      userId: user.uid,
      workspaceId: workspaceRef.id,
      title: "לוח ראשי",
      privacy: "private",
      sortOrder: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  batch.set(
    userRef,
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      workspacesSeeded: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  await ensureDefaultWorkspaces(user);
}
