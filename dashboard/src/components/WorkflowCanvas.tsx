import React from 'react';
import {
  Lightbulb,
  Search,
  Target,
  Layout,
  Palette,
  Code2,
  Smartphone,
  Wrench,
  Package,
  Bot,
  Eye,
  Sparkles,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileCode2,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react';
import type { WorkflowStageNode, StageStatus } from '../types';

interface WorkflowCanvasProps {
  nodes: WorkflowStageNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: WorkflowStageNode) => void;
  onOpenArtifact: (artifactName: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Lightbulb: <Lightbulb className="w-5 h-5 text-amber-400" />,
  Search: <Search className="w-5 h-5 text-blue-400" />,
  Target: <Target className="w-5 h-5 text-emerald-400" />,
  Layout: <Layout className="w-5 h-5 text-indigo-400" />,
  Palette: <Palette className="w-5 h-5 text-pink-400" />,
  Code2: <Code2 className="w-5 h-5 text-cyan-400" />,
  Smartphone: <Smartphone className="w-5 h-5 text-violet-400" />,
  Wrench: <Wrench className="w-5 h-5 text-yellow-400" />,
  Package: <Package className="w-5 h-5 text-teal-400" />,
  Bot: <Bot className="w-5 h-5 text-green-400" />,
  Eye: <Eye className="w-5 h-5 text-fuchsia-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-rose-400" />,
  Globe: <Globe className="w-5 h-5 text-sky-400" />,
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onOpenArtifact,
}) => {
  const getStatusBadge = (status: StageStatus) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-700">
            <MinusCircle className="w-3 h-3 mr-1" />
            Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
            <Clock className="w-3 h-3 mr-1" />
            Waiting
          </span>
        );
    }
  };

  return (
    <div className="w-full relative overflow-x-auto py-6 px-4">
      {/* Node Grid Layout */}
      <div className="min-w-[1100px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
        {nodes.map((node, index) => {
          const isSelected = selectedNodeId === node.id;
          const isRunning = node.status === 'RUNNING';
          const isSuccess = node.status === 'SUCCESS';
          const isFailed = node.status === 'FAILED';

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              className={`glass-panel glass-panel-hover p-4 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                isSelected ? 'ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-950/20' : ''
              } ${isRunning ? 'node-running' : ''}`}
            >
              {/* Top Header inside Node */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shadow-inner">
                      {ICON_MAP[node.iconName] || <Bot className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Stage {node.number}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-100 leading-tight">
                        {node.name}
                      </h3>
                    </div>
                  </div>
                  {getStatusBadge(node.status)}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-3">
                  {isRunning && node.currentOperation ? node.currentOperation : node.shortDesc}
                </p>
              </div>

              {/* Bottom Footer inside Node */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {node.artifactPath ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenArtifact(node.artifactPath!);
                    }}
                    className="inline-flex items-center text-[11px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                  >
                    <FileCode2 className="w-3.5 h-3.5 mr-1" />
                    {node.artifactPath.split('/').pop()}
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-500">No output</span>
                )}

                {node.durationMs ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    {(node.durationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>

              {/* Connecting Flow Indicator Arrow for next node */}
              {index < nodes.length - 1 && (
                <div className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <div
                    className={`w-6 h-0.5 ${
                      isSuccess
                        ? 'bg-emerald-500/80'
                        : isRunning
                        ? 'bg-indigo-500 animate-pulse'
                        : 'bg-slate-700/50'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
