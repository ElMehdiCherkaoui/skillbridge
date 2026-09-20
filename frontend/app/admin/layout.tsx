"use client";

import { ReactNode } from "react";
import { useRequireAuth } from "@/hooks/useAuth";
import AppShell from "@/components/layout/AppShell";
import { LoadingState } from "@/components/ui/Spinner";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireAuth("admin");

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <AppShell role="admin" title="Administration" subtitle={user.fullName}>
      {children}
    </AppShell>
  );
}