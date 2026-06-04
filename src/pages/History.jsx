import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PipelineRun } from "@/api/localStorageDB";
import { Link } from "react-router-dom";
import { Clock, ChevronRight, CheckCircle2, Wrench, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import JsonViewer from "@/components/compiler/JsonViewer";
import AssumptionsPanel from "@/components/compiler/AssumptionsPanel";
import StatusBadge from "@/components/compiler/StatusBadge";
import { format } from "date-fns";

export default function History() {
  const [selectedRunId, setSelectedRunId] = useState(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["pipeline-runs-all"],
    queryFn: () => PipelineRun.list("-created_date", 50),
  });

  const selectedRun = runs.find(r => r.id === selectedRunId);

  const parseJson = (str) => {
    if (!str) return null;
    try { return typeof str === "string" ? JSON.parse(str) : str; } catch { return null; }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Pipeline History</h1>
        <p className="text-gray-500 text-sm">{runs.length} runs — click any to inspect full output</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading history...</span>
        </div>
      )}

      {!isLoading && runs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">No pipeline runs yet</div>
          <div className="text-gray-400 text-xs mt-1">
            <Link to="/" className="text-indigo-600 hover:underline">Run the compiler</Link> to see history here
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Run List */}
          <div className="lg:col-span-1 space-y-2">
            {runs.map(run => (
              <button
                key={run.id}
                onClick={() => setSelectedRunId(run.id === selectedRunId ? null : run.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all duration-150",
                  selectedRunId === run.id
                    ? "bg-indigo-50 border-indigo-300 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <StatusBadge status={run.status} className="text-xs" />
                  <span className="text-xs text-gray-400 font-mono">
                    {run.created_date ? format(new Date(run.created_date), "MMM d, HH:mm") : "—"}
                  </span>
                </div>
                <div className="text-xs text-gray-700 line-clamp-2 mb-2">{run.prompt}</div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{run.total_latency_ms || 0}ms</span>
                  {run.repair_count > 0 && <span className="text-amber-600">{run.repair_count} repairs</span>}
                  <span>#{run.id.slice(0, 6)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Run Detail */}
          <div className="lg:col-span-2">
            {selectedRun ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={selectedRun.status} />
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="font-mono">{selectedRun.total_latency_ms || 0}ms</span>
                      {selectedRun.repair_count > 0 && <span className="text-amber-600">{selectedRun.repair_count} repairs</span>}
                    </div>
                  </div>
                  <div className="text-sm text-gray-800 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {selectedRun.prompt}
                  </div>
                </div>

                {/* Stage latencies */}
                {selectedRun.stage_latencies && (() => {
                  const lat = parseJson(selectedRun.stage_latencies);
                  if (!lat) return null;
                  return (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-600 mb-3">Stage Latencies</div>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(lat).map(([stage, ms]) => (
                          <div key={stage} className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-400">{stage}</div>
                            <div className="text-xs font-mono font-bold text-gray-700 mt-0.5">{ms}ms</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Output Tabs */}
                <RunOutputTabs run={selectedRun} parseJson={parseJson} />

                {/* Assumptions */}
                <AssumptionsPanel assumptions={parseJson(selectedRun.assumptions) || []} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <ChevronRight className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Select a run from the list to inspect its full output</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RunOutputTabs({ run, parseJson }) {
  const [tab, setTab] = useState("final");

  const tabs = [
    { id: "final", label: "Final JSON", value: parseJson(run.final_json) },
    { id: "ir", label: "Intent IR", value: parseJson(run.ir_output) },
    { id: "arch", label: "Architecture", value: parseJson(run.architecture_output) },
    { id: "db", label: "DB Schema", value: parseJson(run.db_schema) },
    { id: "api", label: "API Schema", value: parseJson(run.api_schema) },
    { id: "repair", label: "Repair Log", value: parseJson(run.repair_log) },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
              tab === t.id ? "border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        <JsonViewer data={tabs.find(t => t.id === tab)?.value || "No data"} maxHeight="500px" />
      </div>
    </div>
  );
}