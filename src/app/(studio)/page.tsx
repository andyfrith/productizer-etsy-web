"use client";

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
import { MiniMock } from "@/components/mini-mock/MiniMock";
import { DbStatus } from "@/components/studio/db-status";

/**
 * Studio home — P0 shell with DB health and skeleton demo.
 */
export default function StudioHomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60 bg-card/40 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MiniMock className="h-10 w-10 shrink-0" />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <h1 className="text-xl font-semibold tracking-tight">
                Productizer
              </h1>
              <p className="text-sm text-muted-foreground">
                Design studio for Etsy-ready products
              </p>
            </motion.div>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Phase P0
          </span>
        </div>
      </header>

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
              Concept gallery and generation workflows arrive in later phases.
            </p>
            <Button variant="default" className="w-fit" disabled>
              Concept gallery (coming in P1)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loading pattern</CardTitle>
            <CardDescription>
              Skeleton placeholders for gallery cards (P1+).
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
