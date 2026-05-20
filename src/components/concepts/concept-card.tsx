"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConceptDto } from "@/lib/concepts/types";

const statusVariant: Record<
  ConceptDto["status"],
  "default" | "secondary" | "outline"
> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};

export interface ConceptCardProps {
  concept: ConceptDto;
  index?: number;
}

/**
 * Gallery card linking to concept detail.
 */
export function ConceptCard({ concept, index = 0 }: ConceptCardProps) {
  const created = new Date(concept.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/concepts/${concept.id}`} className="block h-full">
        <Card
          data-testid="concept-card"
          className="h-full transition-colors hover:border-primary/40"
        >
          <CardHeader>
            {concept.previewAssetId ? (
              <div className="mb-3 overflow-hidden rounded-md border border-border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/assets/${concept.previewAssetId}/file?variant=thumb`}
                  alt=""
                  className="h-20 w-full object-cover"
                />
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2 text-base">
                {concept.name}
              </CardTitle>
              <Badge variant={statusVariant[concept.status]}>
                {concept.status}
              </Badge>
            </div>
            {concept.campaignLabel ? (
              <CardDescription>{concept.campaignLabel}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Created {created}</p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
