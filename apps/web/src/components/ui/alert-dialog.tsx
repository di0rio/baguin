// Falta no cd/ui: esta versão local (coss ui, Base UI) usa os tokens do cd e deve migrar para lá.
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type React from "react";
import { cn } from "../../lib/utils";

export const AlertDialog: typeof AlertDialogPrimitive.Root = AlertDialogPrimitive.Root;

export function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props): React.ReactElement {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

/** Janela central que exige uma resposta: sem saída por clique fora. Mesma entrada do `DialogPopup` do cd/ui. */
export function AlertDialogPopup({ className, ...props }: AlertDialogPrimitive.Popup.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-base ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-fast"
        data-slot="alert-dialog-backdrop"
      />
      <AlertDialogPrimitive.Viewport className="fixed inset-0 z-50 grid items-center justify-items-center p-4" data-slot="alert-dialog-viewport">
        <AlertDialogPrimitive.Popup
          className={cn("cd-popup relative flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-popover p-6 text-popover-foreground outline-none", className)}
          data-slot="alert-dialog-popup"
          {...props}
        />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col gap-1.5", className)} data-slot="alert-dialog-header" {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): React.ReactElement {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} data-slot="alert-dialog-footer" {...props} />;
}

export function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props): React.ReactElement {
  return <AlertDialogPrimitive.Title className={cn("font-heading font-bold text-lg leading-tight", className)} data-slot="alert-dialog-title" {...props} />;
}

export function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props): React.ReactElement {
  return <AlertDialogPrimitive.Description className={cn("text-muted-foreground text-sm", className)} data-slot="alert-dialog-description" {...props} />;
}

export function AlertDialogClose(props: AlertDialogPrimitive.Close.Props): React.ReactElement {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}
