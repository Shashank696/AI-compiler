import { AlertTriangle, ArrowRight, CheckCircle2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ValidationReport({ report, repairLog = [], onAccept, status }) {
  if (!report) return null;

  const issues = report.issues || [];
  const isValid = report.is_valid;

  if (isValid && repairLog.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-emerald-800">Validation Passed</div>
          <div className="text-xs text-emerald-600 mt-0.5">All cross-layer dependencies resolved. No mismatches detected.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Issues */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {issues.length} Conflict{issues.length > 1 ? "s" : ""} Detected
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {issues.map((issue, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "text-xs font-mono px-1.5 py-0.5 rounded mt-0.5",
                    issue.severity === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {issue.type || issue.layer || "conflict"}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs text-amber-900">{issue.description}</div>
                    {issue.suggested_fix && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-700 font-medium">Suggested fix: {issue.suggested_fix}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repair Log */}
      {repairLog.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-indigo-200">
            <Wrench className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-800">
              {repairLog.length} Repair{repairLog.length > 1 ? "s" : ""} Applied
            </span>
          </div>
          <div className="divide-y divide-indigo-100">
            {repairLog.map((repair, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <div>
                  <span className="text-xs font-mono text-indigo-700">{repair.target_layer || repair.layer}</span>
                  <span className="text-xs text-indigo-600 ml-2">· {repair.action_taken}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}