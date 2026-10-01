import { Link } from "react-router";
import { cn } from "../lib/utils";

/** Carinha do Baguin: quadrado arredondado índigo com dois olhos e um sorriso. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <circle cx="11.5" cy="13.5" r="2.2" fill="#fff" />
      <circle cx="20.5" cy="13.5" r="2.2" fill="#fff" />
      <path d="M10.5 19.5c1.4 2.2 3.3 3.2 5.5 3.2s4.1-1 5.5-3.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("flex min-w-0 items-center gap-2.5 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Logo />
      <span className="truncate text-[0.95rem]">Baguin</span>
    </Link>
  );
}
