"use client";

import { FormEvent, useState } from "react";
import {
  Check,
  Copy,
  Hourglass,
  Plus,
  Send,
  ShieldAlert,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { adminApi, invitesApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { Invite, User, InviteRole } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody, PageHeader } from "@/components/ui/Card";
import { TextInput, SelectInput } from "@/components/ui/Field";
import StatusBadge from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

function inviteStatus(inv: Invite): "pending" | "used" | "expired" {
  if (inv.acceptedAt) return "used";
  if (new Date(inv.expiresAt) < new Date()) return "expired";
  return "pending";
}

export default function AdminTeam() {
  const team = useAsync<User[]>(() => adminApi.team());
  const invites = useAsync<Invite[]>(() => invitesApi.list());
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<InviteRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toRevoke, setToRevoke] = useState<Invite | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedLink(null);
    if (!email.trim() || !fullName.trim()) {
      setError("Please fill in the email and full name.");
      return;
    }
    setCreating(true);
    try {
      const inv = await invitesApi.create({
        email: email.trim(),
        role,
        fullName: fullName.trim(),
      });
      setEmail("");
      setFullName("");
      setRole("student");
      invites.reload();
      if (inv.token) {
        const link = `${window.location.origin}/invite?token=${inv.token}`;
        setCreatedLink(link);
        toast.success(`Invitation created for ${inv.email}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      toast.success("Invitation link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link below");
    }
  }

  async function confirmRevoke() {
    if (!toRevoke) return;
    setRevoking(true);
    try {
      await invitesApi.revoke(toRevoke.id);
      setToRevoke(null);
      invites.reload();
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team & Invites"
        subtitle="Every account is created from an invitation you send. Share the link with the invitee."
      />

      <Card>
        <CardHeader
          title="Send an invitation"
          subtitle="The invitee sets their own name and password when they accept."
        />
        <CardBody>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          {createdLink && (
            <div className="mb-4 rounded-xl border border-brand-500/30 bg-brand-500/100/10 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-brand-500 dark:text-brand-300">
                <Check className="h-4 w-4" />
                Invitation ready — share this link
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 text-xs text-ink">
                  {createdLink}
                </code>
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <TextInput
                label="Email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="lg:col-span-1">
              <TextInput
                label="Full name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="lg:col-span-1">
              <SelectInput
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
              >
                <option value="student">Student</option>
                <option value="admin">Teacher / Admin</option>
              </SelectInput>
            </div>
            <div className="flex items-end lg:col-span-1">
              <Button type="submit" loading={creating} className="w-full">
                <Send className="h-4 w-4" />
                {creating ? "Creating…" : "Send invitation"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Team members"
            subtitle={`${(team.data ?? []).length} account${(team.data ?? []).length === 1 ? "" : "s"}`}
          />
          {team.loading ? (
            <ModalSkeleton />
          ) : team.error ? (
            <div className="p-4">
              <ErrorState message={team.error} retry={team.reload} />
            </div>
          ) : (team.data ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Users className="h-9 w-9 text-brand-400" />}
                title="No members yet"
                description="Accounts appear here once invitations are accepted."
              />
            </div>
          ) : (
            <ul className="divide-y divide-edge-soft">
              {(team.data ?? []).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.fullName} role={u.role} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{u.fullName}</p>
                      <p className="truncate text-xs text-ink-3">{u.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={u.role} label={u.role} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Invitations"
            subtitle={`${(invites.data ?? []).length} issued`}
          />
          {invites.loading ? (
            <ModalSkeleton />
          ) : invites.error ? (
            <div className="p-4">
              <ErrorState message={invites.error} retry={invites.reload} />
            </div>
          ) : (invites.data ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<UserPlus className="h-9 w-9 text-brand-400" />}
                title="No invitations yet"
                description="Use the form above to invite your first teammate."
              />
            </div>
          ) : (
            <ul className="divide-y divide-edge-soft">
              {(invites.data ?? []).map((inv) => {
                const status = inviteStatus(inv);
                return (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{inv.email}</p>
                      <p className="flex items-center gap-1.5 text-xs text-ink-3">
                        {inv.fullName || "No name yet"} · {inv.role}
                        {status === "used" && (
                          <span className="text-emerald-500">
                            · accepted {new Date(inv.acceptedAt!).toLocaleDateString()}
                          </span>
                        )}
                        {status === "expired" && (
                          <span className="inline-flex items-center gap-1 text-rose-500">
                            <Hourglass className="h-3 w-3" /> expired
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {status === "pending" && (
                        <button
                          className="btn-ghost px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-500/10 dark:text-rose-400"
                          onClick={() => setToRevoke(inv)}
                        >
                          Revoke
                        </button>
                      )}
                      {status === "expired" && (
                        <ShieldAlert className="h-4 w-4 text-ink-3" aria-label="Expired" />
                      )}
                      {status === "pending" && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={toRevoke !== null}
        onClose={() => setToRevoke(null)}
        onConfirm={confirmRevoke}
        busy={revoking}
        title="Revoke invitation"
        message={`This invalidates the invitation for ${toRevoke?.email}. They will no longer be able to create an account with it.`}
        confirmLabel="Revoke invitation"
      />
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
          <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-surface-2" />
        </div>
      ))}
    </div>
  );
}