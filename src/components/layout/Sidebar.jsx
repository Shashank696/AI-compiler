import { Link, useLocation } from "react-router-dom";
import { Code2, GitBranch, BarChart3, History, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Compiler", path: "/", icon: Code2, description: "Run pipeline" },
  { label: "Pipeline Viz", path: "/pipeline-viz", icon: GitBranch, description: "Flow diagram" },
  { label: "Evaluation", path: "/evaluation", icon: BarChart3, description: "Benchmarks" },
  { label: "History", path: "/history", icon: History, description: "Past runs" },
  { label: "Runtime", path: "/runtime", icon: Cpu, description: "Generated files" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 tracking-tight">AppCompiler</div>
            <div className="text-xs text-gray-400">NL → App Config</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600")} />
              <div>
                <div className={cn("text-sm font-medium", isActive ? "text-indigo-700" : "")}>{item.label}</div>
                <div className="text-xs text-gray-400">{item.description}</div>
              </div>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          <span className="font-medium text-gray-500">v1.0</span> · Multi-stage compiler pipeline
        </div>
      </div>
    </aside>
  );
}