import { RequireAuth } from "@/components/layout/RequireAuth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
