"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConceptForm } from "@/components/concepts/concept-form";
import { StudioHeader } from "@/components/studio/studio-header";
import { useCreateConcept } from "@/hooks/use-concepts";
import type { ConceptFormValues } from "@/lib/schemas/concept";

/**
 * Create a new design concept.
 */
export default function NewConceptPage() {
  const router = useRouter();
  const createConcept = useCreateConcept();

  async function handleSubmit(values: ConceptFormValues) {
    const concept = await createConcept.mutateAsync(values);
    router.push(`/concepts/${concept.id}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <StudioHeader phaseLabel="Phase P2" subtitle="New concept" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link
          href="/concepts"
          className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to concepts
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>New concept</CardTitle>
            <CardDescription>
              Name and optional campaign label; you can refine details later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConceptForm
              submitLabel="Create concept"
              isSubmitting={createConcept.isPending}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
