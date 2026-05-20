"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface DbHealthResponse {
  ok: boolean;
  error?: string;
}

/**
 * Shows live Postgres connectivity from /api/health/db.
 */
export function DbStatus() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["db-health"],
    queryFn: async (): Promise<DbHealthResponse> => {
      const res = await fetch("/api/health/db");
      return res.json() as Promise<DbHealthResponse>;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div data-testid="db-status" className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const connected = !isError && data?.ok === true;

  return (
    <p
      data-testid="db-status"
      className={
        connected
          ? "text-sm text-emerald-400"
          : "text-sm text-amber-400"
      }
      role="status"
    >
      {connected ? "Database connected" : "Database unavailable"}
    </p>
  );
}
