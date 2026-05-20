"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  conceptFormSchema,
  type ConceptFormValues,
} from "@/lib/schemas/concept";

export interface ConceptFormProps {
  defaultValues?: Partial<ConceptFormValues>;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (values: ConceptFormValues) => void | Promise<void>;
}

/**
 * Shared create/edit form for design concepts.
 */
export function ConceptForm({
  defaultValues,
  submitLabel = "Save concept",
  isSubmitting = false,
  onSubmit,
}: ConceptFormProps) {
  const form = useForm<ConceptFormValues>({
    resolver: standardSchemaResolver(conceptFormSchema),
    defaultValues: {
      name: "",
      description: "",
      campaignLabel: "",
      styleNotes: "",
      ...defaultValues,
    },
  });

  return (
    <form
      data-testid="concept-form"
      className="space-y-4"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-2">
        <Label htmlFor="concept-name">Name</Label>
        <Input
          id="concept-name"
          data-testid="concept-name-input"
          placeholder="Sunset botanical print"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept-campaign">Campaign label</Label>
        <Input
          id="concept-campaign"
          placeholder="cottagecore, pet parent, …"
          {...form.register("campaignLabel")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept-description">Description</Label>
        <Textarea
          id="concept-description"
          rows={3}
          placeholder="What is this concept about?"
          {...form.register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept-style">Style notes</Label>
        <Textarea
          id="concept-style"
          rows={2}
          placeholder="Palette, mood, typography hints"
          {...form.register("styleNotes")}
        />
      </div>

      <Button
        type="submit"
        data-testid="concept-save"
        disabled={isSubmitting}
        className="w-fit"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
