"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AssetDto } from "@/lib/assets/types";
import type { ConceptDto } from "@/lib/concepts/types";

const referencesKey = (conceptId: string, archived: boolean) =>
  ["concepts", conceptId, "references", { archived }] as const;

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

function invalidateConceptAssets(
  queryClient: ReturnType<typeof useQueryClient>,
  conceptId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["concepts", conceptId] });
  void queryClient.invalidateQueries({
    queryKey: ["concepts", conceptId, "references"],
  });
  void queryClient.invalidateQueries({ queryKey: ["concepts"] });
}

/**
 * Lists active or archived reference images for a concept.
 */
export function useConceptReferences(
  conceptId: string,
  options: { archived?: boolean } = {},
) {
  const archived = options.archived ?? false;

  return useQuery({
    queryKey: referencesKey(conceptId, archived),
    queryFn: () =>
      fetchJson<AssetDto[]>(
        `/api/concepts/${conceptId}/references?archived=${archived}`,
      ),
    enabled: Boolean(conceptId),
  });
}

/**
 * Uploads a reference image and adds it to the concept library.
 */
export function useUploadAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conceptId", conceptId);

      return fetchJson<AssetDto>("/api/assets", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      invalidateConceptAssets(queryClient, conceptId);
      toast.success("Reference image added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Sets which reference asset is the concept preview image.
 */
export function useSetPreviewAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      fetchJson<ConceptDto>(`/api/concepts/${conceptId}/preview`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      }),
    onSuccess: () => {
      invalidateConceptAssets(queryClient, conceptId);
      toast.success("Preview image updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Archives an active reference image (soft remove).
 */
export function useArchiveReferenceAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      fetchJson<ConceptDto>(
        `/api/assets/${assetId}?conceptId=${encodeURIComponent(conceptId)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      invalidateConceptAssets(queryClient, conceptId);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Restores an archived reference image to the active library.
 */
export function useRestoreReferenceAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      fetchJson<ConceptDto>(
        `/api/assets/${assetId}?conceptId=${encodeURIComponent(conceptId)}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      invalidateConceptAssets(queryClient, conceptId);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Permanently deletes an archived reference image and its files.
 */
export function usePermanentDeleteReferenceAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) =>
      fetchJson<ConceptDto>(
        `/api/assets/${assetId}?conceptId=${encodeURIComponent(conceptId)}&permanent=true`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      invalidateConceptAssets(queryClient, conceptId);
      toast.success("Reference permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Toast duration for undo after reference archive (ms). */
export const REFERENCE_REMOVE_UNDO_MS = 8_000;
