import React from 'react';
import { X, FileCode2, Clock, CheckCircle2, Bot, Layers, ArrowRight } from 'lucide-react';
import type { WorkflowStageNode } from '../types';

interface AgentDetailDrawerProps {
  node: WorkflowStageNode | null;
  onClose: () => void;
  onOpenArtifact: (artifactName: string) => void;
}

export const AgentDetailDrawer: React.FC<AgentDetailDrawerProps> = ({
  node,
  onClose,
  onOpenArtifact,
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6 flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Stage {node.number} Inspector
                </span>
                <h3 className="text-base font-bold text-slate-100">{node.name}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status & Duration Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Execution Status</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                {node.status}
              </div>
            </div>

            <div className="glass-panel p-3 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Execution Time</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Clock className="w-4 h-4 text-indigo-400" />
                {node.durationMs ? `${(node.durationMs / 1000).toFixed(1)}s` : 'Instant'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Agent Responsibilities
            </h4>
            <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed">
              {node.shortDesc}
            </p>
          </div>

          {/* Input / Output Artifact Mapping */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
              Artifact Flow Mapping
            </h4>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Primary Output Artifact:</span>
                {node.artifactPath ? (
                  <span className="text-indigo-400 font-bold">{node.artifactPath}</span>
                ) : (
                  <span className="text-slate-500">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="pt-4 border-t border-slate-800">
          {node.artifactPath ? (
            <button
              onClick={() => {
                onOpenArtifact(node.artifactPath!);
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-indigo-600/20"
            >
              <FileCode2 className="w-4 h-4" />
              Inspect Full JSON Artifact
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          ) : (
            <button
              disabled
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-slate-500 font-semibold text-xs cursor-not-allowed"
            >
              No Artifact Available
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
