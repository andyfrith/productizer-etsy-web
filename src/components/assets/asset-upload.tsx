"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  REFERENCE_REMOVE_UNDO_MS,
  useArchiveReferenceAsset,
  useConceptReferences,
  usePermanentDeleteReferenceAsset,
  useRestoreReferenceAsset,
  useSetPreviewAsset,
  useUploadAsset,
} from "@/hooks/use-reference-assets";
import type { AssetDto } from "@/lib/assets/types";
import {
  ALLOWED_ASSET_MIME_TYPES,
  MAX_ASSET_BYTES,
} from "@/lib/schemas/asset";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AssetUploadProps {
  conceptId: string;
  previewAssetId: string | null;
}

type ViewMode = "active" | "archived";
type TileKind = "pending" | "active" | "archived";

interface ReferenceTileProps {
  kind: TileKind;
  src: string;
  alt: string;
  label: string;
  testId: string;
  isPreview?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onArchive?: () => void;
  archiveLabel?: string;
  archiveTestId?: string;
  footer?: React.ReactNode;
  isBusy?: boolean;
}

/**
 * Reference image tile for active, pending, or archived states.
 */
function ReferenceTile({
  kind,
  src,
  alt,
  label,
  testId,
  isPreview = false,
  isSelected = false,
  onSelect,
  onArchive,
  archiveLabel = "Archive",
  archiveTestId,
  footer,
  isBusy = false,
}: ReferenceTileProps) {
  const isPending = kind === "pending";
  const isArchived = kind === "archived";

  return (
    <figure
      className={cn(
        "relative max-w-xs space-y-2 rounded-lg transition-shadow",
        isPending && "p-2 ring-2 ring-amber-500/25",
        kind === "active" && isPreview && "p-2 ring-2 ring-primary/60",
        isArchived &&
          "cursor-pointer p-2 hover:ring-2 hover:ring-muted-foreground/30",
        isArchived && isSelected && "ring-2 ring-primary",
      )}
      data-reference-kind={kind}
      data-reference-preview={isPreview ? "true" : undefined}
      data-testid={isArchived ? "asset-archived-card" : undefined}
      onClick={isArchived ? onSelect : undefined}
      onKeyDown={
        isArchived
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      role={isArchived ? "button" : undefined}
      tabIndex={isArchived ? 0 : undefined}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "line-clamp-1 text-xs font-medium",
            isPending
              ? "text-amber-800 dark:text-amber-300"
              : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {isPending ? (
          <Badge
            variant="outline"
            className="border-amber-500/60 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          >
            Not uploaded
          </Badge>
        ) : isPreview ? (
          <Badge>Preview</Badge>
        ) : isArchived ? (
          <Badge variant="outline">Archived</Badge>
        ) : (
          <Badge variant="secondary">Reference</Badge>
        )}
      </figcaption>
      <div
        className={cn(
          "relative overflow-hidden rounded-md",
          isPending
            ? "border-2 border-dashed border-amber-500/80 bg-amber-500/5"
            : isArchived
              ? "border border-dashed border-muted-foreground/40 bg-muted/20 opacity-90"
              : "border border-border bg-muted/30",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid={testId}
          src={src}
          alt={alt}
          className={cn(
            "max-h-48 w-full object-contain",
            isPending && "opacity-95",
          )}
        />
        {!isArchived && onArchive ? (
          <Button
            type="button"
            variant={isPending ? "outline" : "secondary"}
            size="sm"
            className="absolute top-2 right-2 shadow-sm"
            data-testid={
              archiveTestId ??
              (isPreview ? "asset-preview-archive" : "asset-reference-archive")
            }
            aria-label={`${archiveLabel} ${label}`}
            disabled={isBusy}
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
          >
            {isPending ? (
              <X className="size-3.5" aria-hidden />
            ) : (
              <Archive className="size-3.5" aria-hidden />
            )}
            {archiveLabel}
          </Button>
        ) : null}
      </div>
      {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}
    </figure>
  );
}

/**
 * Reference image library with upload, preview selection, archive, and permanent delete.
 */
export function AssetUpload({
  conceptId,
  previewAssetId,
}: AssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedArchivedId, setSelectedArchivedId] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: activeReferences = [], isLoading: activeLoading } =
    useConceptReferences(conceptId, { archived: false });
  const { data: archivedReferences = [], isLoading: archivedLoading } =
    useConceptReferences(conceptId, { archived: true });

  const upload = useUploadAsset(conceptId);
  const setPreview = useSetPreviewAsset(conceptId);
  const archiveReference = useArchiveReferenceAsset(conceptId);
  const restoreReference = useRestoreReferenceAsset(conceptId);
  const permanentDelete = usePermanentDeleteReferenceAsset(conceptId);

  const references = viewMode === "active" ? activeReferences : archivedReferences;
  const referencesLoading =
    viewMode === "active" ? activeLoading : archivedLoading;

  const localPreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    setSelectedArchivedId(null);
  }

  function showArchiveUndoToast(message: string, onUndo: () => void) {
    toast.success(message, {
      duration: REFERENCE_REMOVE_UNDO_MS,
      action: {
        label: "Undo",
        onClick: onUndo,
      },
    });
  }

  function validateFile(file: File): string | null {
    if (!(ALLOWED_ASSET_MIME_TYPES as readonly string[]).includes(file.type)) {
      return "Invalid file type. Use PNG, JPEG, or WebP.";
    }

    if (file.size > MAX_ASSET_BYTES) {
      return "File exceeds 10 MB limit.";
    }

    return null;
  }

  function clearLocalSelection() {
    setSelectedFile(null);
    setLocalError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileSelect(file: File | undefined) {
    setLocalError(null);
    setSelectedFile(null);

    if (!file) {
      return;
    }

    const error = validateFile(file);

    if (error) {
      setLocalError(error);
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setLocalError("Choose an image first.");
      return;
    }

    setLocalError(null);
    await upload.mutateAsync(selectedFile);
    clearLocalSelection();
  }

  function handleRemovePending() {
    if (!selectedFile) {
      return;
    }

    const file = selectedFile;
    clearLocalSelection();
    showArchiveUndoToast("Selection removed", () => {
      setSelectedFile(file);
      setLocalError(null);
    });
  }

  async function handleArchiveAsset(asset: AssetDto) {
    const assetId = asset.id;

    try {
      await archiveReference.mutateAsync(assetId);
      showArchiveUndoToast("Reference archived", () => {
        void restoreReference.mutateAsync(assetId);
      });
    } catch {
      // Error toast from mutation
    }
  }

  async function confirmPermanentDelete() {
    if (!selectedArchivedId) {
      return;
    }

    await permanentDelete.mutateAsync(selectedArchivedId);
    setSelectedArchivedId(null);
    setDeleteDialogOpen(false);
  }

  const isBusy =
    upload.isPending ||
    setPreview.isPending ||
    archiveReference.isPending ||
    restoreReference.isPending ||
    permanentDelete.isPending;

  return (
    <section
      data-testid="asset-upload"
      className="space-y-4 rounded-lg border border-border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Reference images</h3>
          <p className="text-sm text-muted-foreground">
            Add references and choose a preview for the gallery. Archiving hides
            an image until you open Archived; permanent delete is only available
            there.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === "active" ? "default" : "outline"}
            size="sm"
            data-testid="reference-view-active"
            onClick={() => switchView("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={viewMode === "archived" ? "default" : "outline"}
            size="sm"
            data-testid="reference-view-archived"
            onClick={() => switchView("archived")}
          >
            Archived
            {archivedReferences.length > 0
              ? ` (${archivedReferences.length})`
              : ""}
          </Button>
        </div>
      </div>

      {referencesLoading ? (
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-40 w-48 rounded-md" />
          <Skeleton className="h-40 w-48 rounded-md" />
        </div>
      ) : null}

      {!referencesLoading &&
      (references.length > 0 ||
        (viewMode === "active" && localPreviewUrl)) ? (
        <div
          data-testid="reference-gallery"
          className="flex flex-wrap gap-6"
        >
          {viewMode === "active"
            ? references.map((asset) => {
                const isPreview = previewAssetId === asset.id;

                return (
                  <ReferenceTile
                    key={asset.id}
                    kind="active"
                    src={`/api/assets/${asset.id}/file?variant=card`}
                    alt={asset.originalFilename}
                    label={asset.originalFilename}
                    testId={isPreview ? "asset-preview" : "asset-reference-card"}
                    isPreview={isPreview}
                    isBusy={isBusy}
                    onArchive={() => void handleArchiveAsset(asset)}
                    footer={
                      !isPreview ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`asset-set-preview-${asset.id}`}
                          disabled={isBusy}
                          onClick={() => void setPreview.mutateAsync(asset.id)}
                        >
                          Set as preview
                        </Button>
                      ) : null
                    }
                  />
                );
              })
            : references.map((asset) => (
                <ReferenceTile
                  key={asset.id}
                  kind="archived"
                  src={`/api/assets/${asset.id}/file?variant=card`}
                  alt={asset.originalFilename}
                  label={asset.originalFilename}
                  testId="asset-archived-thumb"
                  isSelected={selectedArchivedId === asset.id}
                  isBusy={isBusy}
                  onSelect={() =>
                    setSelectedArchivedId((current) =>
                      current === asset.id ? null : asset.id,
                    )
                  }
                />
              ))}
          {viewMode === "active" && localPreviewUrl ? (
            <ReferenceTile
              kind="pending"
              src={localPreviewUrl}
              alt="Selected reference (not uploaded yet)"
              label={selectedFile?.name ?? "New image"}
              testId="asset-preview-local"
              archiveLabel="Remove"
              archiveTestId="asset-preview-local-remove"
              isBusy={isBusy}
              onArchive={handleRemovePending}
            />
          ) : null}
        </div>
      ) : null}

      {!referencesLoading && references.length === 0 && !localPreviewUrl ? (
        <p
          data-testid="reference-empty-hint"
          className="text-sm text-muted-foreground"
        >
          {viewMode === "active"
            ? "No active reference images yet. Choose a file below to add one."
            : "No archived reference images."}
        </p>
      ) : null}

      {viewMode === "archived" ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            {selectedArchivedId
              ? "Selected archived reference. Permanent delete cannot be undone."
              : "Select an archived reference to delete permanently."}
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="asset-permanent-delete"
            disabled={!selectedArchivedId || isBusy}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete permanently
          </Button>
        </div>
      ) : null}

      {viewMode === "active" ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="asset-file-input">Add reference image</Label>
            <input
              ref={inputRef}
              id="asset-file-input"
              type="file"
              accept={ALLOWED_ASSET_MIME_TYPES.join(",")}
              className="block max-w-xs text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              disabled={isBusy}
            />
          </div>
          <Button
            type="button"
            disabled={isBusy || !selectedFile}
            onClick={() => void handleUpload()}
          >
            {upload.isPending ? "Uploading…" : "Upload reference"}
          </Button>
        </div>
      ) : null}

      {localError ? (
        <p className="text-sm text-destructive" role="alert">
          {localError}
        </p>
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reference permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the image files from storage and cannot be undone.
              The reference will no longer appear in Active or Archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="asset-permanent-delete-confirm"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void confirmPermanentDelete()}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
