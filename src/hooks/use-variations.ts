"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ConceptDto } from "@/lib/concepts/types";
import type { VariationDto } from "@/lib/variations/types";

const variationsKey = (conceptId: string) =>
  ["variations", conceptId] as const;

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

function invalidateVariationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  conceptId: string,
) {
  void queryClient.invalidateQueries({ queryKey: variationsKey(conceptId) });
  void queryClient.invalidateQueries({ queryKey: ["concepts", conceptId] });
  void queryClient.invalidateQueries({ queryKey: ["concepts"] });
}

/**
 * Lists variations for a concept.
 */
export function useVariations(conceptId: string) {
  return useQuery({
    queryKey: variationsKey(conceptId),
    queryFn: () =>
      fetchJson<VariationDto[]>(`/api/concepts/${conceptId}/variations`),
    enabled: Boolean(conceptId),
  });
}

/**
 * Uploads a new variation image for a concept.
 */
export function useUploadVariation(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { file: File; parentVariationId?: string }) => {
      const formData = new FormData();
      formData.append("file", input.file);

      if (input.parentVariationId) {
        formData.append("parentVariationId", input.parentVariationId);
      }

      return fetchJson<VariationDto>(`/api/concepts/${conceptId}/variations`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      invalidateVariationQueries(queryClient, conceptId);
      toast.success("Variation added");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Creates a variation by copying the concept preview reference asset.
 */
export function useCreateVariationFromAsset(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { assetId: string; parentVariationId?: string }) =>
      fetchJson<VariationDto>(
        `/api/concepts/${conceptId}/variations/from-asset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      invalidateVariationQueries(queryClient, conceptId);
      toast.success("Variation branched from preview");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Updates a variation's approval status.
 */
export function usePatchVariationStatus(conceptId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      variationId: string;
      status: "pending" | "approved" | "rejected";
    }) =>
      fetchJson<VariationDto>(
        `/api/concepts/${conceptId}/variations/${input.variationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: input.status }),
        },
      ),
    onSuccess: (variation) => {
      invalidateVariationQueries(queryClient, conceptId);

      if (variation.status === "approved") {
        toast.success("Variation approved");
      } else if (variation.status === "rejected") {
        toast.success("Variation rejected");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Re-export concept type for gallery consumers. */
export type { ConceptDto };
