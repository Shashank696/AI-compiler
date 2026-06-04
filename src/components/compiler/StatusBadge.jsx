import { CheckCircle2, AlertTriangle, XCircle, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const configs = {
  success: { icon: CheckCircle2, label: "Valid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  valid: { icon: CheckCircle2, label: "Valid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  repaired: { icon: Wrench, label: "Repaired", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  failed: { icon: XCircle, label: "Failed", cls: "bg-red-50 text-red-700 border-red-200" },
  running: { icon: Loader2, label: "Running", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  pending: { icon: AlertTriangle, label: "Pending", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

export default function StatusBadge({ status, className }) {
  const cfg = configs[status] || configs.pending;
  const Icon = cfg.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold", cfg.cls, className)}>
      <Icon className={cn("w-3.5 h-3.5", status === "running" && "animate-spin")} />
      {cfg.label}
    </span>
  );
}