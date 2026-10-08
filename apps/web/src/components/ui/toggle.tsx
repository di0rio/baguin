// Falta no cd/ui: esta versão local (coss ui, Base UI) usa os tokens do cd e deve migrar para lá.
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "../../lib/utils";

export const toggleVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-(--radius-button) border font-medium text-sm outline-none",
    "transition-[color,background-color,border-color,transform] duration-instant ease-out motion-safe:active:scale-[0.97]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "data-disabled:pointer-events-none data-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    defaultVariants: { size: "md", variant: "outline" },
    variants: {
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-3.5",
      },
      variant: {
        // ligado = tinta cheia (amarelo é só da ação principal e do microfone)
        outline: "border-border bg-background hover:bg-accent data-pressed:border-transparent data-pressed:bg-foreground data-pressed:text-background",
      },
    },
  },
);

export function Toggle({ className, variant, size, ...props }: TogglePrimitive.Props & VariantProps<typeof toggleVariants>): React.ReactElement {
  return <TogglePrimitive className={cn(toggleVariants({ size, variant }), className)} data-slot="toggle" {...props} />;
}
