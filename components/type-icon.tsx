import { CarFront, HeartPulse, House, Plane, Shield } from "lucide-react";
import type { InsuranceSchema } from "@/lib/schemas/contracts";

const icons = { car: CarFront, heart: HeartPulse, plane: Plane, home: House, shield: Shield };
const colors = {
  car: "bg-info-soft text-info",
  heart: "bg-brand-soft text-brand-strong",
  plane: "bg-success-soft text-success",
  home: "bg-warning-soft text-warning",
  shield: "bg-surface-muted text-text-muted",
};
export function TypeIcon({
  type,
  size = "normal",
}: {
  type: InsuranceSchema["icon"];
  size?: "normal" | "large";
}) {
  const Icon = icons[type];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${colors[type]} ${size === "large" ? "h-[60px] w-[60px]" : "h-11 w-11"}`}
    >
      <Icon size={size === "large" ? 27 : 21} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
