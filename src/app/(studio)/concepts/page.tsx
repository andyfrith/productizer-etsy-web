"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConceptCard } from "@/components/concepts/concept-card";
import { StudioHeader } from "@/components/studio/studio-header";
import { useConcepts } from "@/hooks/use-concepts";

/**
 * Concept gallery — list active design concepts.
 */
export default function ConceptsPage() {
  const { data: concepts, isLoading, isError, error } = useConcepts();

  return (
    <div className="flex flex-1 flex-col">
      <StudioHeader phaseLabel="Phase P3" subtitle="Design concepts" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Concepts</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage design concepts before variations and mocks.
            </p>
          </div>
          <Link href="/concepts/new">
            <Button>New concept</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ) : null}

        {isError ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}

        {!isLoading && !isError && concepts?.length === 0 ? (
          <div
            data-testid="concept-empty-state"
            className="rounded-xl border border-dashed border-border p-10 text-center"
          >
            <p className="text-muted-foreground">No concepts yet.</p>
            <Link href="/concepts/new" className="mt-4 inline-block">
              <Button>Create your first concept</Button>
            </Link>
          </div>
        ) : null}

        {!isLoading && concepts && concepts.length > 0 ? (
          <div
            data-testid="concept-gallery"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {concepts.map((concept, index) => (
              <ConceptCard key={concept.id} concept={concept} index={index} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
