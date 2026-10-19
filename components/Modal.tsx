"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Localised accessible name for the close button. */
  closeLabel?: string;
  children: React.ReactNode;
};

/** Accessible dialog built on the native <dialog> element (focus trap + Esc handled by the browser). */
export function Modal({ open, onClose, title, description, closeLabel = "Close dialog", children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-navy-border bg-navy-card p-0 text-ink-body shadow-2xl backdrop:bg-navy/80 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-ink-title">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="focus-brand rounded-md p-1 text-ink-muted hover:bg-navy-border hover:text-ink-title"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
