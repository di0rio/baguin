// Falta no cd/ui: esta versão local (coss ui) usa os tokens do cd e deve migrar para lá.
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "../../lib/utils";

const emptyMediaVariants = cva("flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  defaultVariants: { variant: "default" },
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "size-11 rounded-xl border bg-background text-foreground [&_svg:not([class*='size-'])]:size-5",
    },
  },
});

/** Estado vazio. Sem moldura própria: quem usa decide (`tom-alto` na chegada, borda tracejada numa lista). */
export function Empty({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-balance px-6 py-12 text-center md:py-20", className)}
      data-slot="empty"
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex max-w-sm flex-col items-center text-center", className)} data-slot="empty-header" {...props} />;
}

export function EmptyMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>): React.ReactElement {
  return <div className={cn("mb-5", emptyMediaVariants({ variant }), className)} data-slot="empty-media" data-variant={variant} {...props} />;
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("font-heading font-bold text-xl", className)} data-slot="empty-title" {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("text-muted-foreground text-sm [[data-slot=empty-title]+&]:mt-1", className)} data-slot="empty-description" {...props} />;
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm", className)} data-slot="empty-content" {...props} />;
}
