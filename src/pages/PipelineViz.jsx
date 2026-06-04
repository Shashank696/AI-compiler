import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PipelineRun } from "@/api/localStorageDB";
import { Check, AlertTriangle, X, Clock, Loader2, ChevronRight, Database, Globe, Layout, Shield, Cpu, Wrench, Search, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";
import JsonViewer from "@/components/compiler/JsonViewer";

const PIPELINE_NODES = [
  { id: "prompt", label: "User Prompt", sub: "Source", icon: Search, color: "indigo" },
  { id: "ir", label: "Intent IR", sub: "Canonical IR", icon: GitMerge, color: "violet" },
  { id: "arch", label: "Architecture", sub: "Flows + Perms", icon: Globe, color: "blue" },
  { id: "ui_schema", label: "UI Schema", sub: "Pages + Components", icon: Layout, color: "cyan" },
  { id: "api_schema", label: "API Schema", sub: "Endpoints", icon: Globe, color: "teal" },
  { id: "db_schema", label: "DB Schema", sub: "Tables + Columns", icon: Database, color: "emerald" },
  { id: "validation", label: "Validation", sub: "Dep graph check", icon: Search, color: "amber" },
  { id: "repair", label: "Repair Engine", sub: "Auto-fix", icon: Wrench, color: "orange" },
  { id: "runtime", label: "Runtime Output", sub: "Generated files", icon: Cpu, color: "green" },
];

const COLOR_CLASSES = {
  indigo: { node: "bg-indigo-100 border-indigo-400 text-indigo-700", icon: "text-indigo-600" },
  violet: { node: "bg-violet-100 border-violet-400 text-violet-700", icon: "text-violet-600" },
  blue: { node: "bg-blue-100 border-blue-400 text-blue-700", icon: "text-blue-600" },
  cyan: { node: "bg-cyan-100 border-cyan-400 text-cyan-700", icon: "text-cyan-600" },
  teal: { node: "bg-teal-100 border-teal-400 text-teal-700", icon: "text-teal-600" },
  emerald: { node: "bg-emerald-100 border-emerald-400 text-emerald-700", icon: "text-emerald-600" },
  amber: { node: "bg-amber-100 border-amber-400 text-amber-700", icon: "text-amber-600" },
  orange: { node: "bg-orange-100 border-orange-400 text-orange-700", icon: "text-orange-600" },
  green: { node: "bg-green-100 border-green-400 text-green-700", icon: "text-green-600" },
};

function getNodeData(run, nodeId) {
  if (!run) return null;
  const map = {
    prompt: run.prompt,
    ir: run.ir_output,
    arch: run.architecture_output,
    ui_schema: run.ui_schema,
    api_schema: run.api_schema,
    db_schema: run.db_schema,
    validation: run.validation_report,
    repair: run.repair_log,
    runtime: run.runtime_files,
  };
  const val = map[nodeId];
  if (!val) return null;
  try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return val; }
}

function getNodeStatus(run, nodeId) {
  if (!run) return "pending";
  if (run.status === "failed" && run.failure_stage === nodeId) return "error";
  if (run.status === "running") return "pending";
  if (nodeId === "repair") {
    const repairLog = run.repair_log ? JSON.parse(run.repair_log) : [];
    if (repairLog.length === 0) return "skipped";
    return "repaired";
  }
  return "complete";
}

export default function PipelineViz() {
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: runs = [] } = useQuery({
    queryKey: ["pipeline-runs"],
    queryFn: () => PipelineRun.list("-created_date", 20),
  });

  const run = selectedRun ? runs.find(r => r.id === selectedRun) : runs[0] || null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pipeline Visualization</h1>
        <p className="text-gray-500 text-sm">Full compiler flow — click any node to inspect its input/output</p>
      </div>

      {/* Run selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">View run:</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={selectedRun || run?.id || ""}
          onChange={e => { setSelectedRun(e.target.value); setSelectedNode(null); }}
        >
          {runs.map(r => (
            <option key={r.id} value={r.id}>
              {r.prompt?.slice(0, 60)}... · {r.status} · {r.total_latency_ms}ms
            </option>
          ))}
        </select>
        {runs.length === 0 && (
          <span className="text-sm text-gray-400 italic">Run a pipeline in the Compiler tab first</span>
        )}
      </div>

      {run && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flow Diagram */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Compiler Pipeline Flow</h2>
            <div className="flex flex-col items-center gap-0">
              {PIPELINE_NODES.map((node, idx) => {
                const status = getNodeStatus(run, node.id);
                const colors = COLOR_CLASSES[node.color];
                const isActive = selectedNode === node.id;

                return (
                  <div key={node.id} className="flex flex-col items-center w-full">
                    <button
                      onClick={() => setSelectedNode(isActive ? null : node.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200",
                        isActive ? colors.node + " shadow-sm" : "bg-gray-50 border-gray-200 hover:border-gray-300",
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-white border", isActive ? "border-current" : "border-gray-200")}>
                        <node.icon className={cn("w-4 h-4", isActive ? colors.icon : "text-gray-400")} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className={cn("text-xs font-semibold", isActive ? "" : "text-gray-700")}>{node.label}</div>
                        <div className="text-xs text-gray-400">{node.sub}</div>
                      </div>
                      <StatusDot status={status} />
                    </button>
                    {idx < PIPELINE_NODES.length - 1 && (
                      <div className="w-0.5 h-4 bg-gray-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Detail */}
          <div className="lg:col-span-2">
            {selectedNode ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">
                    {PIPELINE_NODES.find(n => n.id === selectedNode)?.label} — Output
                  </span>
                </div>
                <div className="p-4">
                  <JsonViewer
                    data={getNodeData(run, selectedNode) || "No output available for this node"}
                    maxHeight="600px"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="text-gray-400 text-sm mb-2">Click any pipeline node to inspect its output</div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { label: "Status", value: run.status },
                    { label: "Total Latency", value: `${run.total_latency_ms || 0}ms` },
                    { label: "Repairs", value: run.repair_count || 0 },
                  ].map(m => (
                    <div key={m.label} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-xs text-gray-400">{m.label}</div>
                      <div className="text-sm font-bold text-gray-800 mt-1 font-mono">{m.value}</div>
                    </div>
                  ))}
                </div>
                {run.prompt && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                    <div className="text-xs text-gray-400 mb-1">Original prompt</div>
                    <div className="text-sm text-gray-700">{run.prompt}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const cls = {
    complete: "bg-emerald-500",
    repaired: "bg-amber-500",
    error: "bg-red-500",
    running: "bg-indigo-500 animate-pulse",
    skipped: "bg-gray-300",
    pending: "bg-gray-200",
  };
  return <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cls[status] || cls.pending)} />;
}