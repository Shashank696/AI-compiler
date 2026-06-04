import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssumptionsPanel({ assumptions = [] }) {
  const [open, setOpen] = useState(false);

  if (assumptions.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            Documented Assumptions
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {assumptions.length}
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3">
          <ul className="space-y-2">
            {assumptions.map((assumption, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-xs font-mono text-gray-300 mt-0.5 w-5 text-right flex-shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600">{assumption}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}