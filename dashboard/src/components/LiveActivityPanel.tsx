import React, { useEffect, useRef, useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, Info, Sparkles, RefreshCw } from 'lucide-react';
import type { WorkflowEvent } from '../types';

interface LiveActivityPanelProps {
  events: WorkflowEvent[];
  isLive: boolean;
}

export const LiveActivityPanel: React.FC<LiveActivityPanelProps> = ({ events, isLive }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour12: false });
    } catch {
      return isoString;
    }
  };

  const getEventIcon = (evt: WorkflowEvent) => {
    if (evt.status === 'SUCCESS' || evt.type === 'AGENT_COMPLETED' || evt.type === 'WORKFLOW_COMPLETED') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
    }
    if (evt.status === 'FAILED' || evt.type === 'AGENT_FAILED' || evt.type === 'WORKFLOW_FAILED') {
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />;
    }
    if (evt.type === 'AGENT_STARTED' || evt.type === 'WORKFLOW_STARTED') {
      return <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />;
    }
    return <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />;
  };

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden border-l border-slate-800/80">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Activity</h2>
          {isLive && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {events.length} events
          </span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle Auto Scroll"
            className={`p-1 rounded transition-colors ${
              autoScroll ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Feed Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono text-xs">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-[11px] text-center p-4">
            No workflow activity recorded yet. Launch a project pipeline to stream live logs.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:bg-slate-800/40 transition-colors"
            >
              {getEventIcon(evt)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {evt.agent}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {formatTime(evt.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-normal break-words">
                  {evt.message}
                </p>
                {evt.artifactPath && (
                  <span className="inline-block mt-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    Artifact: {evt.artifactPath}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
