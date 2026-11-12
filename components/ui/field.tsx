"use client";

import { useEffect, type ComponentProps, type ReactNode } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-bold text-text">
      {children}
      {optional && <span className="ms-2 font-normal text-text-muted">(اختیاری)</span>}
    </label>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs leading-7 text-text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-sm font-bold leading-7 text-danger">
      {children}
    </p>
  );
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`min-h-28 w-full resize-y rounded-xl border border-border bg-surface-raised px-4 py-3 text-base leading-8 text-text transition placeholder:text-text-muted hover:border-text-muted focus:border-brand aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function TextInput({
  className = "",
  suffix,
  ...props
}: ComponentProps<"input"> & { suffix?: string }) {
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true";
  return (
    <div
      className={`flex min-h-12 w-full items-center rounded-xl border bg-surface-raised transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25 ${invalid ? "border-danger" : "border-border hover:border-text-muted"}`}
    >
      <input
        className={`min-h-12 w-full min-w-0 rounded-xl border-0 bg-transparent px-4 py-2 text-base text-text placeholder:text-text-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      />
      {suffix && (
        <span
          aria-hidden="true"
          className="shrink-0 border-s border-border px-4 text-sm text-text-muted"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

type SelectOption = { value: string; label: string; disabled?: boolean };

// Radix Select is modal and hides the rest of the page from assistive technology.
// Make that same subtree inert so its controls cannot retain keyboard focus while
// aria-hidden. Remove inert synchronously before Radix restores trigger focus.
function setShellInert(open: boolean) {
  const shell = document.getElementById("app-shell");
  if (shell) shell.inert = open;
}

export function SelectInput({
  id,
  value,
  onValueChange,
  options,
  label,
  describedBy,
  disabled,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Use only when the visible label needs a more descriptive accessible name. */
  label?: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  useEffect(() => () => setShellInert(false), []);

  return (
    <Select.Root
      dir="rtl"
      value={value}
      onValueChange={onValueChange}
      onOpenChange={setShellInert}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        aria-label={label}
        aria-describedby={describedBy}
        className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-2 text-base text-text transition hover:border-text-muted data-[state=open]:border-brand data-[state=open]:ring-2 data-[state=open]:ring-brand/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate text-start">
          <Select.Value placeholder="انتخاب کنید">
            {options.find((option) => option.value === value)?.label}
          </Select.Value>
        </span>
        <Select.Icon className="shrink-0 text-text-muted">
          <ChevronDown size={19} aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          align="start"
          collisionPadding={16}
          className="z-50 overflow-hidden rounded-2xl border border-border bg-surface-raised text-text shadow-float"
          style={{
            width: "var(--radix-select-trigger-width)",
            minWidth: "min(16rem, calc(100vw - 2rem))",
            maxWidth: "calc(100vw - 2rem)",
            maxHeight: "min(20rem, var(--radix-select-content-available-height))",
          }}
        >
          <Select.Viewport className="p-1.5">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-12 cursor-pointer select-none items-center rounded-xl px-3 py-2 pe-10 text-sm leading-7 outline-none data-[highlighted]:bg-brand-soft data-[highlighted]:text-brand-strong data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute end-3 flex items-center text-brand-strong">
                  <Check size={18} aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function Checkbox({
  children,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type" | "children"> & { children: ReactNode }) {
  return (
    <label
      className={`inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm font-bold text-text transition hover:border-text-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${className}`}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-text-muted bg-surface-raised checked:border-brand checked:bg-brand disabled:cursor-not-allowed"
          {...props}
        />
        <Check
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute text-on-brand opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}
