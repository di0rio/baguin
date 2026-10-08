// Falta no cd/ui: esta versão local (coss ui, Base UI) usa os tokens do cd e deve migrar para lá.
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { XIcon } from "lucide-react";
import type React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

export const Sheet: typeof SheetPrimitive.Root = SheetPrimitive.Root;

export function SheetTrigger(props: SheetPrimitive.Trigger.Props): React.ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: SheetPrimitive.Close.Props): React.ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

/**
 * Painel lateral. Entra por opacidade + deslocamento curto (só `transform` e `opacity`).
 * `backdrop={false}` (com `modal={false}` na raiz) deixa o que está atrás clicável.
 */
export function SheetPopup({
  className,
  children,
  showCloseButton = true,
  side = "right",
  backdrop = true,
  viewportClassName,
  ...props
}: SheetPrimitive.Popup.Props & {
  backdrop?: boolean;
  viewportClassName?: string;
  showCloseButton?: boolean;
  side?: "right" | "left";
}): React.ReactElement {
  return (
    <SheetPrimitive.Portal>
      {backdrop && (
        <SheetPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-base ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-fast"
          data-slot="sheet-backdrop"
        />
      )}
      <SheetPrimitive.Viewport
        className={cn("fixed inset-0 z-50 flex sm:p-3", side === "left" ? "justify-start" : "justify-end", !backdrop && "pointer-events-none", viewportClassName)}
        data-slot="sheet-viewport"
      >
        <SheetPrimitive.Popup
          className={cn(
            "relative flex max-h-full min-h-0 w-full min-w-0 max-w-md flex-col rounded-2xl border bg-popover text-popover-foreground outline-none",
            "transition-[opacity,translate] duration-base ease-out will-change-transform data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-fast",
            side === "left" ? "data-ending-style:-translate-x-4 data-starting-style:-translate-x-4" : "data-ending-style:translate-x-4 data-starting-style:translate-x-4",
            !backdrop && "pointer-events-auto",
            className,
          )}
          data-slot="sheet-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close aria-label="Fechar" className="absolute end-2 top-2" render={<Button size="icon-sm" variant="ghost" />}>
              <XIcon />
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetPrimitive.Viewport>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, render, ...props }: useRender.ComponentProps<"div">): React.ReactElement {
  const padrao = { className: cn("flex flex-col gap-2 p-6", className), "data-slot": "sheet-header" };
  return useRender({ defaultTagName: "div", props: mergeProps<"div">(padrao, props), render });
}

export function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props): React.ReactElement {
  return <SheetPrimitive.Title className={cn("font-heading font-bold text-xl leading-none", className)} data-slot="sheet-title" {...props} />;
}

export function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props): React.ReactElement {
  return <SheetPrimitive.Description className={cn("text-muted-foreground text-sm", className)} data-slot="sheet-description" {...props} />;
}

/** Miolo rolável do painel. */
export function SheetPanel({ className, render, ...props }: useRender.ComponentProps<"div">): React.ReactElement {
  const padrao = { className: cn("min-h-0 flex-1 overflow-y-auto p-6", className), "data-slot": "sheet-panel" };
  return useRender({ defaultTagName: "div", props: mergeProps<"div">(padrao, props), render });
}
