"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AssetUpload } from "@/components/assets/asset-upload";
import { ConceptForm } from "@/components/concepts/concept-form";
import { StudioHeader } from "@/components/studio/studio-header";
import {
  useArchiveConcept,
  useConcept,
  useUpdateConcept,
} from "@/hooks/use-concepts";
import type { ConceptFormValues } from "@/lib/schemas/concept";

type PageProps = { params: Promise<{ id: string }> };

/**
 * Concept detail — view, edit, and archive.
 */
export default function ConceptDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: concept, isLoading, isError } = useConcept(id);
  const updateConcept = useUpdateConcept(id);
  const archiveConcept = useArchiveConcept();
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function handleSubmit(values: ConceptFormValues) {
    await updateConcept.mutateAsync(values);
  }

  async function handleArchive() {
    await archiveConcept.mutateAsync(id);
    setArchiveOpen(false);
    router.push("/concepts");
  }

  return (
    <div className="flex flex-1 flex-col">
      <StudioHeader phaseLabel="Phase P2" subtitle="Concept detail" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/concepts"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to concepts
        </Link>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : null}

        {isError ? (
          <p className="text-sm text-destructive">Concept not found.</p>
        ) : null}

        {concept ? (
          <Card>
            <CardHeader>
              <CardTitle>{concept.name}</CardTitle>
              <CardDescription>
                Status: {concept.status} · Updated{" "}
                {new Date(concept.updatedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AssetUpload
                conceptId={concept.id}
                previewAssetId={concept.previewAssetId}
              />

              <ConceptForm
                key={concept.updatedAt}
                defaultValues={{
                  name: concept.name,
                  description: concept.description ?? "",
                  campaignLabel: concept.campaignLabel ?? "",
                  styleNotes: concept.styleNotes ?? "",
                }}
                submitLabel="Save changes"
                isSubmitting={updateConcept.isPending}
                onSubmit={handleSubmit}
              />

              <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogTrigger
                  data-testid="concept-archive"
                  className="w-fit"
                  render={
                    <Button variant="destructive" className="w-fit" />
                  }
                >
                  Archive concept
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this concept?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It will be hidden from the default gallery. You can still
                      list archived concepts with a filter in a later phase.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleArchive()}
                      disabled={archiveConcept.isPending}
                    >
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
