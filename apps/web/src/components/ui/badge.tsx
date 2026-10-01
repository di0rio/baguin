
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-transparent font-medium outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button&,a&]:cursor-pointer [button&,a&]:pointer-coarse:after:absolute [button&,a&]:pointer-coarse:after:size-full [button&,a&]:pointer-coarse:after:min-h-11 [button&,a&]:pointer-coarse:after:min-w-11",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-5.5 min-w-5.5 px-[calc(--spacing(1)-1px)] text-sm sm:h-4.5 sm:min-w-4.5 sm:text-xs",
        lg: "h-6.5 min-w-6.5 px-[calc(--spacing(1.5)-1px)] text-base sm:h-5.5 sm:min-w-5.5 sm:text-sm",
        sm: "h-5 min-w-5 rounded-[.25rem] px-[calc(--spacing(1)-1px)] text-xs sm:h-4 sm:min-w-4 sm:text-[.625rem]",
      },
      variant: {
        default:
          "border-primary/32 bg-primary/4 text-primary [button&,a&]:hover:bg-primary/8 dark:bg-primary/8",
        destructive:
          "border-destructive/32 bg-destructive/4 text-destructive-foreground [button&,a&]:hover:bg-destructive/8 dark:bg-destructive/8",
        error:
          "border-destructive/32 bg-destructive/4 text-destructive-foreground [button&,a&]:hover:bg-destructive/8 dark:bg-destructive/8",
        info: "border-info/32 bg-info/4 text-info-foreground [button&,a&]:hover:bg-info/8 dark:bg-info/8",
        outline:
          "border-input bg-background text-foreground [button&,a&]:hover:bg-accent/50 dark:bg-input/32 dark:[button&,a&]:hover:bg-input/48",
        secondary:
          "border-secondary/32 bg-secondary/4 text-secondary [button&,a&]:hover:bg-secondary/8 dark:bg-secondary/8",
        success:
          "border-success/32 bg-success/4 text-success-foreground [button&,a&]:hover:bg-success/8 dark:bg-success/8",
        warning:
          "border-warning/32 bg-warning/4 text-warning-foreground [button&,a&]:hover:bg-warning/8 dark:bg-warning/8",
      },
    },
  },
);

export interface BadgeProps extends useRender.ComponentProps<"span"> {
  variant?: VariantProps<typeof badgeVariants>["variant"];
  size?: VariantProps<typeof badgeVariants>["size"];
}

export function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: BadgeProps): React.ReactElement {
  const defaultProps = {
    className: cn(badgeVariants({ className, size, variant })),
    "data-slot": "badge",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}
