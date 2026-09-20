"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, PartyPopper, MailCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Progress";
import { ApiRequestError } from "@/lib/api";

function InviteForm({ initialToken }: { initialToken: string }) {
  const { accept, user } = useAuth();
  const router = useRouter();

  const [token, setToken] = useState(initialToken ?? "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.replace(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Please enter your invitation code.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await accept(token.trim(), fullName.trim(), password);
      router.replace(created.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.apiError?.error ?? err.message
          : "Could not accept the invitation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-brand-500 to-violet-500" />
        <div className="p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-violet-500/10">
            <Gift className="h-6 w-6 text-brand-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Accept your invitation</h1>
          <p className="mt-1 text-sm text-ink-2">
            You&apos;ve been invited to join SkillBridge. Set your name and a password to begin.
          </p>

          {error && (
            <div className="mt-5">
              <Alert kind="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <TextInput
              label="Invitation code"
              placeholder="Paste the code from your invitation"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              required
            />
            <TextInput
              label="Full name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
            <TextInput
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <TextInput
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <Button type="submit" loading={submitting} className="w-full" size="lg">
              <PartyPopper className="h-4 w-4" />
              {submitting ? "Creating account…" : "Create my account"}
            </Button>
          </form>
        </div>
      </div>
      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm text-ink-3">
        <MailCheck className="h-3.5 w-3.5" />
        Already have an account?{" "}
        <a href="/login" className="font-semibold text-brand-500 hover:underline dark:text-brand-400">
          Sign in
        </a>
      </p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Suspense fallback={null}>
        <InviteToken />
      </Suspense>
    </div>
  );
}

function InviteToken() {
  const params = useSearchParams();
  return <InviteForm initialToken={params.get("token") ?? ""} />;
}