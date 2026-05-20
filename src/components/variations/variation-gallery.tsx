"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateVariationFromAsset,
  usePatchVariationStatus,
  useUploadVariation,
  useVariations,
} from "@/hooks/use-variations";
import {
  ALLOWED_ASSET_MIME_TYPES,
  MAX_ASSET_BYTES,
} from "@/lib/schemas/asset";
import type { VariationDto } from "@/lib/variations/types";
import { cn } from "@/lib/utils";

export interface VariationGalleryProps {
  conceptId: string;
  previewAssetId: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function statusBadge(status: VariationDto["status"]) {
  if (status === "approved") {
    return <Badge>Approved</Badge>;
  }

  if (status === "rejected") {
    return <Badge variant="outline">Rejected</Badge>;
  }

  return <Badge variant="secondary">Pending</Badge>;
}

/**
 * Variation candidates with upload, branch-from-preview, and approve/reject workflow.
 */
export function VariationGallery({
  conceptId,
  previewAssetId,
}: VariationGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const [parentVariationId, setParentVariationId] = useState<string | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: variations = [], isLoading } = useVariations(conceptId);
  const upload = useUploadVariation(conceptId);
  const fromAsset = useCreateVariationFromAsset(conceptId);
  const patchStatus = usePatchVariationStatus(conceptId);

  const parentLabel = useMemo(() => {
    if (!parentVariationId) {
      return null;
    }

    const parent = variations.find((v) => v.id === parentVariationId);
    return parent ? `Branching from variation ${parent.id.slice(0, 8)}…` : null;
  }, [parentVariationId, variations]);

  const isBusy =
    upload.isPending || fromAsset.isPending || patchStatus.isPending;

  function validateFile(file: File): string | null {
    if (!(ALLOWED_ASSET_MIME_TYPES as readonly string[]).includes(file.type)) {
      return "Invalid file type. Use PNG, JPEG, or WebP.";
    }

    if (file.size > MAX_ASSET_BYTES) {
      return "File exceeds 10 MB limit.";
    }

    return null;
  }

  async function handleUpload(file: File | undefined) {
    setLocalError(null);

    if (!file) {
      return;
    }

    const error = validateFile(file);

    if (error) {
      setLocalError(error);
      return;
    }

    await upload.mutateAsync({
      file,
      parentVariationId: parentVariationId ?? undefined,
    });

    setParentVariationId(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleBranchFromPreview() {
    if (!previewAssetId) {
      return;
    }

    setLocalError(null);
    await fromAsset.mutateAsync({
      assetId: previewAssetId,
      parentVariationId: parentVariationId ?? undefined,
    });
    setParentVariationId(null);
  }

  const GridWrapper = reducedMotion ? "div" : motion.div;
  const CardWrapper = reducedMotion ? "div" : motion.div;

  return (
    <section
      data-testid="variation-gallery"
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div>
        <h3 className="text-sm font-medium">Variations</h3>
        <p className="text-sm text-muted-foreground">
          Upload art directions, branch from references, and approve one winner at
          a time.
        </p>
      </div>

      {parentLabel ? (
        <p className="text-xs text-muted-foreground">
          {parentLabel}{" "}
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => setParentVariationId(null)}
          >
            Clear
          </button>
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-40 w-48 rounded-md" />
          <Skeleton className="h-40 w-48 rounded-md" />
        </div>
      ) : null}

      {!isLoading && variations.length > 0 ? (
        <GridWrapper
          className="flex flex-wrap gap-6"
          {...(!reducedMotion
            ? {
                variants: containerVariants,
                initial: "hidden",
                animate: "show",
              }
            : {})}
        >
          {variations.map((variation) => {
            const isApproved = variation.status === "approved";
            const isPending = variation.status === "pending";

            return (
              <CardWrapper
                key={variation.id}
                className={cn(
                  "max-w-xs space-y-2 rounded-lg p-2 transition-shadow",
                  isApproved && "ring-2 ring-primary/60",
                  variation.status === "rejected" && "opacity-70",
                )}
                data-variation-status={variation.status}
                {...(!reducedMotion
                  ? { variants: cardVariants }
                  : {})}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(variation.createdAt).toLocaleString()}
                  </span>
                  {statusBadge(variation.status)}
                </div>
                {variation.parentVariationId ? (
                  <p className="text-xs text-muted-foreground">
                    Child of {variation.parentVariationId.slice(0, 8)}…
                  </p>
                ) : null}
                <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={variation.thumbUrl}
                    alt={`Variation ${variation.id}`}
                    className="max-h-48 w-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {isPending ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        data-testid="variation-approve"
                        disabled={isBusy}
                        onClick={() =>
                          void patchStatus.mutateAsync({
                            variationId: variation.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid="variation-reject"
                        disabled={isBusy}
                        onClick={() =>
                          void patchStatus.mutateAsync({
                            variationId: variation.id,
                            status: "rejected",
                          })
                        }
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => setParentVariationId(variation.id)}
                  >
                    <GitBranch className="size-3.5" aria-hidden />
                    Branch
                  </Button>
                </div>
              </CardWrapper>
            );
          })}
        </GridWrapper>
      ) : null}

      {!isLoading && variations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variations yet. Upload an image or branch from the preview reference.
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="space-y-2">
          <Label htmlFor="variation-file-input">Add variation</Label>
          <input
            ref={inputRef}
            id="variation-file-input"
            data-testid="variation-upload"
            type="file"
            accept={ALLOWED_ASSET_MIME_TYPES.join(",")}
            className="block max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            disabled={isBusy}
            onChange={(e) => void handleUpload(e.target.files?.[0])}
          />
        </div>
        {previewAssetId ? (
          <Button
            type="button"
            variant="outline"
            data-testid="variation-from-preview"
            disabled={isBusy}
            onClick={() => void handleBranchFromPreview()}
          >
            {fromAsset.isPending ? "Branching…" : "Branch from preview"}
          </Button>
        ) : null}
      </div>

      {localError ? (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      ) : null}
    </section>
  );
}
