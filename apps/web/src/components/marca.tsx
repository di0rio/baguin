import { Link } from "react-router";
import { cn } from "../lib/utils";
import { Logo as LogoCd } from "./ui/logo";

/** Carinha do Baguin: quadrado de tinta com dois olhos e um sorriso de papel. O traço da cd ainda está em aberto (docs/design.md). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="10" className="fill-foreground" />
      <circle cx="11.5" cy="13.5" r="2.2" className="fill-background" />
      <circle cx="20.5" cy="13.5" r="2.2" className="fill-background" />
      <path d="M10.5 19.5c1.4 2.2 3.3 3.2 5.5 3.2s4.1-1 5.5-3.2" fill="none" className="stroke-background" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("flex min-w-0 items-center gap-2.5 rounded-md font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Logo />
      <span className="truncate text-[0.95rem]">Baguin</span>
    </Link>
  );
}

/** Assinatura "feito por cd": o único lugar onde o boneco da cd aparece. */
export function Assinatura({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
      <span>feito por</span>
      <span aria-hidden>
        <LogoCd variant="mark" size="sm" />
      </span>
      <span className="sr-only">cd</span>
    </p>
  );
}
