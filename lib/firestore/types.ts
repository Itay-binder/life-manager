import type { Timestamp } from "firebase/firestore";

export type ItemKind = "task" | "habit";

export type DomainDoc = {
  userId: string;
  name: string;
  sortOrder: number;
  createdAt: Timestamp;
};

export type UserProfileDoc = {
  email: string | null;
  displayName: string | null;
  domainsSeeded: boolean;
  createdAt: Timestamp;
};

export type ItemDoc = {
  userId: string;
  domainId: string;
  kind: ItemKind;
  title: string;
  /** דקות — אופציונלי */
  estimateMinutes?: number | null;
  status: "open" | "done";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** למשימות חד-פעמיות */
  completedAt?: Timestamp | null;
  /** למסלול הרגלים — YYYY-MM-DD בזמן מקומי של המשתמש */
  lastCompletedDate?: string | null;
  streakCurrent?: number;
  streakBest?: number;
};
