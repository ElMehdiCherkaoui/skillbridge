"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGuestOnly } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Progress";
import { LoadingState } from "@/components/ui/Spinner";
import { ApiRequestError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { loading } = useGuestOnly();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.apiError?.error ?? err.message : "Login failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="card overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-violet-500" />
          <div className="p-8">
            <h1 className="text-xl font-bold tracking-tight text-ink">Welcome back</h1>
            <p className="mt-1 text-sm text-ink-2">
              Sign in to your workspace as a student or teacher.
            </p>

            {error && (
              <div className="mt-5">
                <Alert kind="error">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TextInput
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextInput
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" loading={submitting} className="w-full" size="lg">
                <LogIn className="h-4 w-4" />
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-ink-3">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Invited to join SkillBridge?{" "}
          <a href="/invite" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
            Accept your invitation
          </a>
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-3">
          <ShieldCheck className="h-3.5 w-3.5" />
          Accounts are created by invitation only.
          <KeyRound className="h-3.5 w-3.5 ml-1" />
        </p>
      </div>
    </div>
  );
}