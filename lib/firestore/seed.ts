import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { User } from "firebase/auth";
import { DEFAULT_WORKSPACE_NAMES } from "@/lib/domains/defaults";

const usersCol = "users";
const workspacesCol = "workspaces";
const boardsCol = "boards";

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
  if (data?.workspacesSeeded) return;

  const batch = writeBatch(db);
  DEFAULT_WORKSPACE_NAMES.forEach((name, index) => {
    const workspaceRef = doc(collection(db, workspacesCol));
    const boardRef = doc(collection(db, boardsCol));
    batch.set(workspaceRef, {
      userId: user.uid,
      name,
      parentId: null,
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
}
