"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** shadcn-style Radix dialog: focus trap, Escape dismissal, accessible title. */
export function Dialog({ open, onOpenChange, title, description, children, busy = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content" onPointerDownOutside={(event) => event.preventDefault()}>
          <div className="dialog-heading">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="muted mt-2 text-sm">{description}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="icon-button shrink-0" aria-label="Close dialog" disabled={busy}><X size={20} /></DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
