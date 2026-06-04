import { Check, Loader2, X, SkipForward, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "stage1", label: "Intent Extractor", sub: "NL → IR" },
  { id: "stage2", label: "Architecture", sub: "IR → Flows" },
  { id: "stage3", label: "Schema Gen", sub: "All schemas" },
  { id: "stage4", label: "Validation", sub: "Dep graph" },
  { id: "stage5", label: "Repair Engine", sub: "Auto-fix" },
  { id: "stage6", label: "Refinement", sub: "Cross-layer" },
  { id: "stage7", label: "Runtime", sub: "Generate files" },
];

const statusIcon = (status) => {
  if (status === "running") return <Loader2 className="w-3 h-3 animate-spin" />;
  if (status === "complete" || status === "repaired") return <Check className="w-3 h-3" />;
  if (status === "skipped") return <SkipForward className="w-3 h-3" />;
  if (status === "error") return <X className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
};

const statusColor = (status) => {
  if (status === "running") return "border-indigo-400 bg-indigo-50 text-indigo-700";
  if (status === "complete") return "border-emerald-400 bg-emerald-50 text-emerald-700";
  if (status === "repaired") return "border-amber-400 bg-amber-50 text-amber-700";
  if (status === "skipped") return "border-gray-300 bg-gray-50 text-gray-500";
  if (status === "error") return "border-red-400 bg-red-50 text-red-700";
  return "border-gray-200 bg-white text-gray-400";
};

export default function PipelineStepper({ stageStates = {}, latencies = {} }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start gap-0 min-w-max">
        {STAGES.map((stage, idx) => {
          const state = stageStates[stage.id] || {};
          const status = state.status || "pending";
          const latency = latencies[stage.id];

          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 px-1">
                {/* Node */}
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  statusColor(status)
                )}>
                  {statusIcon(status)}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className={cn(
                    "text-xs font-semibold",
                    status === "running" ? "text-indigo-700" :
                    status === "complete" ? "text-emerald-700" :
                    status === "repaired" ? "text-amber-700" :
                    status === "error" ? "text-red-700" :
                    "text-gray-400"
                  )}>{stage.label}</div>
                  <div className="text-xs text-gray-400">{stage.sub}</div>
                  {latency && <div className="text-xs text-gray-300 font-mono">{latency}ms</div>}
                </div>
              </div>

              {/* Connector */}
              {idx < STAGES.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mt-[-18px] transition-all duration-300",
                  status === "complete" || status === "repaired" ? "bg-indigo-300" : "bg-gray-200"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}