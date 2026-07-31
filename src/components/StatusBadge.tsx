import type { DeviceStatus } from "@/services/types";

const map: Record<DeviceStatus, { label: string; className: string }> = {
  active: { label: "نشط", className: "bg-success/15 text-success border-success/30" },
  inactive: { label: "غير نشط", className: "bg-warning/15 text-warning border-warning/30" },
  blocked: { label: "محظور", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${s.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}