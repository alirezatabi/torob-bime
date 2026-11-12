import { CarFront, HeartPulse, House, Plane, Shield } from "lucide-react";
import type { InsuranceSchema } from "@/lib/schemas/contracts";

const icons = { car: CarFront, heart: HeartPulse, plane: Plane, home: House, shield: Shield };
const colors = {
  car: "bg-[#edf4fb] text-[#526f8c]",
  heart: "bg-[#fdf0ef] text-[#a34d55]",
  plane: "bg-[#edf7f5] text-[#397354]",
  home: "bg-[#f7f1e9] text-[#8a5b38]",
  shield: "bg-[#f2f4f7] text-[#63707d]",
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
