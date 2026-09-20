"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Send } from "lucide-react";
import { studentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { User } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, PageHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Field";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

export default function AdminStudents() {
  const [query, setQuery] = useState("");
  const { data, error, loading, reload } = useAsync<User[]>(() =>
    studentsApi.list(query),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="View registered students and their progress."
        action={
          <Link href="/admin/team">
            <Button variant="secondary">
              <Send className="h-4 w-4" />
              Invite a student
            </Button>
          </Link>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <TextInput
          aria-label="Search students"
          placeholder="Search by name or email…"
          className="!pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Send className="h-9 w-9 text-brand-400" />}
          title={query ? "No student matches your search" : "No students yet"}
          description={
            query
              ? "Try a different name or email."
              : "Students join through invitations. Send an invite to bring them into the workspace."
          }
          action={
            <Link href="/admin/team">
              <Button>
                <Send className="h-4 w-4" />
                Send invitations
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Registered</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName} role="student" size="sm" />
                      <span className="font-semibold text-ink">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="text-ink-2">{u.email}</td>
                  <td className="text-ink-3">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/students/${u.id}`}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}