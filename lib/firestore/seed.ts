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
import { DEFAULT_DOMAIN_NAMES } from "@/lib/domains/defaults";

const usersCol = "users";
const domainsCol = "domains";

export async function seedUserIfNeeded(user: User): Promise<void> {
  const db = getDb();
  const userRef = doc(db, usersCol, user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      domainsSeeded: false,
      createdAt: serverTimestamp(),
    });
  }

  const after = await getDoc(userRef);
  const data = after.data() as { domainsSeeded?: boolean } | undefined;
  if (data?.domainsSeeded) return;

  const batch = writeBatch(db);
  DEFAULT_DOMAIN_NAMES.forEach((name, index) => {
    const dRef = doc(collection(db, domainsCol));
    batch.set(dRef, {
      userId: user.uid,
      name,
      sortOrder: index,
      createdAt: serverTimestamp(),
    });
  });
  batch.set(
    userRef,
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      domainsSeeded: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
}
