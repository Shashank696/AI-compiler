import { useState, useRef } from "react";
import { Play, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { orchestratePipeline } from "@/lib/pipeline/orchestrator";
import PipelineStepper from "@/components/compiler/PipelineStepper";
import JsonViewer from "@/components/compiler/JsonViewer";
import ValidationReport from "@/components/compiler/ValidationReport";
import AssumptionsPanel from "@/components/compiler/AssumptionsPanel";
import StatusBadge from "@/components/compiler/StatusBadge";

const EXAMPLE_PROMPTS = [
  "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.",
  "Create a project management tool with tasks, teams, comments, file attachments, and Gantt chart view.",
  "Build a multi-vendor e-commerce platform with product listings, cart, payments, seller dashboard, and admin panel.",
];

export default function Compiler() {
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [stageStates, setStageStates] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const outputRef = useRef(null);

  const handleStageUpdate = (stage, data) => {
    setStageStates(prev => ({ ...prev, [stage]: data }));
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setIsRunning(true);
    setResult(null);
    setError(null);
    setStageStates({});

    try {
      const output = await orchestratePipeline(prompt.trim(), handleStageUpdate);
      setResult(output);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err.message || "Pipeline failed");
    } finally {
      setIsRunning(false);
    }
  };

  const latencies = {};
  if (result?.stageLatencies) {
    Object.entries(result.stageLatencies).forEach(([k, v]) => {
      latencies[k] = v;
    });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">AppCompiler</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Natural language → Intermediate Representation → Architecture → Validated Schemas → Executable Runtime
        </p>
        <div className="mt-1 text-xs text-gray-400 font-mono">
          Pipeline: NL → IR → Arch → UI/API/DB/Auth → Validation → Repair → Runtime
        </div>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">Product Description</label>
          <div className="flex gap-2">
            {EXAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                Example {i + 1}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe the app you want to build... e.g. Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics."
          className="min-h-[120px] text-sm resize-none border-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-400">
            7-stage compiler pipeline · Automated repair engine · Runtime code generation
          </div>
          <Button
            onClick={handleRun}
            disabled={isRunning || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Compiling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Pipeline Stepper */}
      {(isRunning || result || error) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Pipeline Execution</h2>
            {result && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <StatusBadge status={result.status} />
                <span>{result.totalLatency}ms total</span>
                {result.repairCount > 0 && (
                  <span className="text-amber-600">{result.repairCount} repairs applied</span>
                )}
              </div>
            )}
          </div>
          <PipelineStepper stageStates={stageStates} latencies={latencies} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-800">Pipeline Failed</div>
            <div className="text-xs text-red-600 mt-1 font-mono">{error}</div>
          </div>
        </div>
      )}

      {/* Output */}
      {result && (
        <div ref={outputRef} className="space-y-4">
          {/* Validation */}
          <ValidationReport
            report={stageStates.stage4?.output}
            repairLog={result.finalJson?.repair_log || []}
            status={result.status}
          />

          {/* Tabs */}
          <OutputTabs finalJson={result.finalJson} irOutput={stageStates.stage1?.output} archOutput={stageStates.stage2?.output} />

          {/* Assumptions */}
          <AssumptionsPanel assumptions={result.finalJson?.assumptions || []} />

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Status", value: result.status },
              { label: "Total Latency", value: `${result.totalLatency}ms` },
              { label: "Repairs", value: result.repairCount },
              { label: "Run ID", value: result.runId?.slice(0, 8) + "..." },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{m.label}</div>
                <div className="text-sm font-semibold text-gray-800 font-mono">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OutputTabs({ finalJson, irOutput, archOutput }) {
  const [tab, setTab] = useState("final");

  const tabs = [
    { id: "final", label: "Final Config" },
    { id: "ir", label: "Intent IR" },
    { id: "arch", label: "Architecture" },
    { id: "ui", label: "UI Schema" },
    { id: "api", label: "API Schema" },
    { id: "db", label: "DB Schema" },
    { id: "auth", label: "Auth Schema" },
  ];

  const data = {
    final: finalJson,
    ir: irOutput,
    arch: archOutput,
    ui: finalJson?.ui_schema,
    api: finalJson?.api_schema,
    db: finalJson?.db_schema,
    auth: finalJson?.auth_schema,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        <JsonViewer data={data[tab]} title={tabs.find(t => t.id === tab)?.label} maxHeight="600px" />
      </div>
    </div>
  );
}