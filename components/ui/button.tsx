import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};
export function Button({ variant = "primary", className = "", type = "button", ...props }: Props) {
  const variants = {
    primary: "bg-brand text-on-brand hover:bg-brand-strong",
    secondary: "border border-border bg-surface-raised text-text hover:border-brand",
    ghost: "text-text-muted hover:bg-surface-muted hover:text-text",
  };
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
export function IconButton({
  label,
  className = "",
  ...props
}: Omit<Props, "aria-label"> & { label: string }) {
  return (
    <Button
      variant="ghost"
      aria-label={label}
      className={`h-11 w-11 shrink-0 p-0 ${className}`}
      {...props}
    />
  );
}
