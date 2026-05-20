import Link from "next/link";
import { MiniMock } from "@/components/mini-mock/MiniMock";

export interface StudioHeaderProps {
  phaseLabel: string;
  title?: string;
  subtitle?: string;
}

/**
 * Shared studio chrome for home and concept routes.
 */
export function StudioHeader({
  phaseLabel,
  title = "Productizer",
  subtitle = "Design studio for Etsy-ready products",
}: StudioHeaderProps) {
  return (
    <header className="border-b border-border/60 bg-card/40 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <MiniMock className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </Link>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {phaseLabel}
        </span>
      </div>
    </header>
  );
}
