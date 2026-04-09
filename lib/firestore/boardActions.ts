import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { BoardPrivacy } from "@/lib/firestore/types";

export async function createWorkspace(params: {
  userId: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
}) {
  await addDoc(collection(getDb(), "workspaces"), {
    userId: params.userId,
    name: params.name.trim(),
    parentId: params.parentId ?? null,
    sortOrder: params.sortOrder,
    createdAt: serverTimestamp(),
  });
}

export async function createBoard(params: {
  userId: string;
  workspaceId: string;
  title: string;
  sortOrder: number;
}) {
  const boardRef = await addDoc(collection(getDb(), "boards"), {
    userId: params.userId,
    workspaceId: params.workspaceId,
    title: params.title.trim(),
    privacy: "private" as BoardPrivacy,
    sortOrder: params.sortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(getDb(), "boardColumns"), {
    userId: params.userId,
    boardId: boardRef.id,
    key: "status",
    title: "סטטוס",
    type: "status",
    sortOrder: 0,
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(getDb(), "boardColumns"), {
    userId: params.userId,
    boardId: boardRef.id,
    key: "owner",
    title: "אחראי",
    type: "text",
    sortOrder: 1,
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(getDb(), "boardColumns"), {
    userId: params.userId,
    boardId: boardRef.id,
    key: "dueDate",
    title: "תאריך יעד",
    type: "date",
    sortOrder: 2,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(getDb(), "boardGroups"), {
    userId: params.userId,
    boardId: boardRef.id,
    title: "קבוצה ראשונה",
    sortOrder: 0,
    createdAt: serverTimestamp(),
  });
}

export async function setBoardPrivacy(boardId: string, privacy: BoardPrivacy) {
  await updateDoc(doc(getDb(), "boards", boardId), {
    privacy,
    updatedAt: serverTimestamp(),
  });
}

export async function renameBoard(boardId: string, title: string) {
  await updateDoc(doc(getDb(), "boards", boardId), {
    title: title.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function createGroup(params: {
  userId: string;
  boardId: string;
  title: string;
  sortOrder: number;
}) {
  await addDoc(collection(getDb(), "boardGroups"), {
    userId: params.userId,
    boardId: params.boardId,
    title: params.title.trim(),
    sortOrder: params.sortOrder,
    createdAt: serverTimestamp(),
  });
}

export async function createBoardItem(params: {
  userId: string;
  boardId: string;
  groupId: string;
  title: string;
}) {
  await addDoc(collection(getDb(), "boardItems"), {
    userId: params.userId,
    boardId: params.boardId,
    groupId: params.groupId,
    title: params.title.trim(),
    status: "חדש",
    dueDate: null,
    estimateMinutes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createColumn(params: {
  userId: string;
  boardId: string;
  key: string;
  title: string;
  sortOrder: number;
}) {
  await addDoc(collection(getDb(), "boardColumns"), {
    userId: params.userId,
    boardId: params.boardId,
    key: params.key.trim(),
    title: params.title.trim(),
    type: "text",
    sortOrder: params.sortOrder,
    createdAt: serverTimestamp(),
  });
}

export async function deleteBoard(boardId: string) {
  await deleteDoc(doc(getDb(), "boards", boardId));
}
