"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { ConceptDto } from "@/lib/concepts/types";
import type { ConceptFormValues } from "@/lib/schemas/concept";

const CONCEPTS_KEY = ["concepts"] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data: unknown = await res.json();

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

/**
 * Lists design concepts (non-archived by default).
 */
export function useConcepts(includeArchived = false) {
  const query = includeArchived ? "?includeArchived=true" : "";

  return useQuery({
    queryKey: [...CONCEPTS_KEY, { includeArchived }],
    queryFn: () => fetchJson<ConceptDto[]>(`/api/concepts${query}`),
  });
}

/**
 * Fetches a single concept by id.
 */
export function useConcept(id: string | undefined) {
  return useQuery({
    queryKey: ["concepts", id],
    queryFn: () => fetchJson<ConceptDto>(`/api/concepts/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Creates a new design concept.
 */
export function useCreateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ConceptFormValues) =>
      fetchJson<ConceptDto>("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONCEPTS_KEY });
      toast.success("Concept created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Updates an existing design concept.
 */
export function useUpdateConcept(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<ConceptFormValues>) =>
      fetchJson<ConceptDto>(`/api/concepts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONCEPTS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["concepts", id] });
      toast.success("Concept saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Archives a design concept (soft delete).
 */
export function useArchiveConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<ConceptDto>(`/api/concepts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONCEPTS_KEY });
      toast.success("Concept archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
