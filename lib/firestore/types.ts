import type { Timestamp } from "firebase/firestore";

export type BoardPrivacy = "private" | "workspace" | "public";

export type WorkspaceDoc = {
  userId: string;
  name: string;
  parentId?: string | null;
  sortOrder: number;
  createdAt: Timestamp;
};

export type UserProfileDoc = {
  email: string | null;
  displayName: string | null;
  workspacesSeeded?: boolean;
  createdAt: Timestamp;
};

export type BoardDoc = {
  userId: string;
  workspaceId: string;
  title: string;
  privacy: BoardPrivacy;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type GroupDoc = {
  userId: string;
  boardId: string;
  title: string;
  sortOrder: number;
  createdAt: Timestamp;
};

export type ColumnDoc = {
  userId: string;
  boardId: string;
  key: string;
  title: string;
  type: "text" | "status" | "date" | "number";
  sortOrder: number;
  createdAt: Timestamp;
};

export type ItemDoc = {
  userId: string;
  boardId: string;
  groupId: string;
  title: string;
  status?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
