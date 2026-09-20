"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";

export type RedirectTarget = "student" | "admin";

export function useRequireAuth(target: RedirectTarget) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const expectedRole: Role = target === "admin" ? "admin" : "student";
    if (user.role !== expectedRole) {
      router.replace(target === "admin" ? "/student/dashboard" : "/admin/dashboard");
    }
  }, [user, loading, router, target]);

  return { user, loading };
}

export function useGuestOnly() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    }
  }, [user, loading, router]);

  return { user, loading };
}