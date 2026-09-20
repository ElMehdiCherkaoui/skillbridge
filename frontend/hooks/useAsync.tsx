"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { ApiRequestError } from "@/lib/api";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T | null) => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) {
        if (e instanceof ApiRequestError) {
          setError(e.apiError?.error ?? e.message);
        } else {
          setError(e instanceof Error ? e.message : "Something went wrong");
        }
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading, reload, setData };
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <CircleAlert className="h-8 w-8 text-red-500" />
      <h3 className="text-base font-semibold text-red-800">Something went wrong</h3>
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      {retry && (
        <button className="btn-secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}