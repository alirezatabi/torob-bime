"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Drawer({
  onClose,
  titleId,
  children,
}: {
  onClose: () => void;
  titleId: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="dialog-backdrop fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-border bg-surface-raised p-0 text-text shadow-float sm:inset-y-0 sm:start-0 sm:end-auto sm:h-dvh sm:max-h-none sm:w-[min(32rem,90vw)] sm:rounded-none sm:rounded-e-3xl"
    >
      {children}
    </dialog>
  );
}
