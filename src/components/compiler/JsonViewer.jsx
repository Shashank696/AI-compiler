import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function syntaxHighlight(json) {
  if (typeof json !== "string") json = JSON.stringify(json, null, 2);
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = "text-sky-600"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-violet-600 font-medium"; // key
        } else {
          cls = "text-emerald-600"; // string value
        }
      } else if (/true|false/.test(match)) {
        cls = "text-amber-600"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-gray-400"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

export default function JsonViewer({ data, title, maxHeight = "500px" }) {
  const [copied, setCopied] = useState(false);

  const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "output").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 px-2 text-gray-500 hover:text-gray-900">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-gray-500 hover:text-gray-900">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      )}
      <div
        style={{ maxHeight, overflowY: "auto" }}
        className="p-4 font-mono text-xs leading-relaxed bg-slate-50"
      >
        <pre
          dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonStr) }}
          className="whitespace-pre-wrap break-words"
        />
      </div>
    </div>
  );
}