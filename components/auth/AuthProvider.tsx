"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { seedUserIfNeeded } from "@/lib/firestore/seed";

type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
};

const AuthContext = createContext<
  AuthState & { refresh: () => Promise<void> }
>({
  user: null,
  loading: true,
  configured: false,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  /** עד לאירוע ההתחלה הראשון מ-Firebase Auth */
  const [loading, setLoading] = useState(configured);

  const refresh = useCallback(async () => {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (u) await seedUserIfNeeded(u);
  }, []);

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await seedUserIfNeeded(u);
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
  }, [configured]);

  const value = useMemo(
    () => ({ user, loading, configured, refresh }),
    [user, loading, configured, refresh],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
