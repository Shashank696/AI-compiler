import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { FileCode, Download, FileText, Database, Globe, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FILE_TYPE_CONFIG = {
  html: { icon: Globe, color: "text-orange-600", bg: "bg-orange-50 border-orange-200", label: "HTML" },
  python: { icon: FileCode, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Python" },
  sql: { icon: Database, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "SQL" },
  dockerfile: { icon: Cpu, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", label: "Docker" },
  markdown: { icon: FileText, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", label: "Markdown" },
};

export default function Runtime() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const { data: runs = [] } = useQuery({
    queryKey: ["pipeline-runs-runtime"],
    queryFn: () => base44.entities.PipelineRun.list("-created_date", 20),
    select: (data) => data.filter(r => r.runtime_files),
  });

  const run = selectedRunId ? runs.find(r => r.id === selectedRunId) : runs[0] || null;

  const runtimeData = (() => {
    if (!run?.runtime_files) return null;
    try { return typeof run.runtime_files === "string" ? JSON.parse(run.runtime_files) : run.runtime_files; } catch { return null; }
  })();

  const files = runtimeData?.files || [];
  const activeFile = selectedFile !== null ? files[selectedFile] : files[0] || null;

  const handleDownloadAll = () => {
    if (!files.length) return;
    files.forEach(file => {
      const blob = new Blob([file.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${files.length} files`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Runtime Output</h1>
          <p className="text-gray-500 text-sm">Generated project files from the compiled app config</p>
        </div>
        {files.length > 0 && (
          <Button onClick={handleDownloadAll} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download All ({files.length} files)
          </Button>
        )}
      </div>

      {/* Run selector */}
      {runs.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Run:</label>
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedRunId || run?.id || ""}
            onChange={e => { setSelectedRunId(e.target.value); setSelectedFile(null); }}
          >
            {runs.map(r => (
              <option key={r.id} value={r.id}>
                {r.prompt?.slice(0, 50)}... · {r.status}
              </option>
            ))}
          </select>
        </div>
      )}

      {!runtimeData && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Cpu className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">No runtime files generated yet</div>
          <div className="text-gray-400 text-xs mt-1">
            <Link to="/" className="text-indigo-600 hover:underline">Run the compiler</Link> to generate project files
          </div>
        </div>
      )}

      {runtimeData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Pages Generated", value: runtimeData.pages_generated || 0, icon: Globe },
              { label: "API Endpoints", value: runtimeData.endpoints_generated || 0, icon: FileCode },
              { label: "DB Tables", value: runtimeData.tables_generated || 0, icon: Database },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <m.icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 font-mono">{m.value}</div>
                  <div className="text-xs text-gray-400">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* File Explorer */}
          <div className="grid grid-cols-4 gap-4 h-[600px]">
            {/* File tree */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-600">Generated Files</div>
                <div className="text-xs text-gray-400 mt-0.5">{runtimeData.runtime} runtime</div>
              </div>
              <div className="p-2 space-y-0.5">
                {files.map((file, idx) => {
                  const cfg = FILE_TYPE_CONFIG[file.type] || FILE_TYPE_CONFIG.markdown;
                  const isActive = (selectedFile === null && idx === 0) || selectedFile === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedFile(idx)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                        isActive ? "bg-indigo-50 border border-indigo-200" : "hover:bg-gray-50"
                      )}
                    >
                      <cfg.icon className={cn("w-3.5 h-3.5 flex-shrink-0", isActive ? "text-indigo-600" : cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate">{file.filename}</div>
                        <div className="text-xs text-gray-400">{cfg.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* File content */}
            <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {activeFile && (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg = FILE_TYPE_CONFIG[activeFile.type] || FILE_TYPE_CONFIG.markdown;
                        return <cfg.icon className={cn("w-4 h-4", cfg.color)} />;
                      })()}
                      <span className="text-sm font-semibold text-gray-700">{activeFile.filename}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded border", FILE_TYPE_CONFIG[activeFile.type]?.bg || "bg-gray-50")}>
                        {FILE_TYPE_CONFIG[activeFile.type]?.label || activeFile.type}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-gray-500"
                      onClick={() => {
                        const blob = new Blob([activeFile.content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = activeFile.filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{activeFile.content}</pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}