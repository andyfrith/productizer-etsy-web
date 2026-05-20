"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioHeader } from "@/components/studio/studio-header";
import { DbStatus } from "@/components/studio/db-status";

/**
 * Studio home — links to concept gallery (P1).
 */
export default function StudioHomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <StudioHeader phaseLabel="Phase P3" />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Studio status</CardTitle>
            <CardDescription>
              Local Postgres via Docker Compose and asset storage on disk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DbStatus />
            <p className="text-sm text-muted-foreground">
              Manage design concepts before uploads, variations, and mocks.
            </p>
            <Link href="/concepts">
              <Button>Concept gallery</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loading pattern</CardTitle>
            <CardDescription>
              Skeleton placeholders for gallery cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              data-testid="skeleton-demo"
              className="grid gap-3 sm:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </motion.div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
