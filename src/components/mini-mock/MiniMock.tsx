import { cn } from "@/lib/utils";

interface MiniMockProps {
  className?: string;
}

/** Static placeholder tile for future dashboard mocks (P6). */
export function MiniMock({ className }: MiniMockProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg bg-gradient-to-br from-primary/80 via-primary to-orange-700 shadow-inner",
        className,
      )}
    />
  );
}
