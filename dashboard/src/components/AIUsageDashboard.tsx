import React from 'react';

interface AIUsageSummary {
  todayRequests: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCachedTokens: number;
  todayTotalTokens: number;
  todayEstimatedCostUsd: number | null;
  activeRpm: number;
  activeTpm: number;
  status: 'HEALTHY' | 'THROTTLED' | 'QUOTA_EXHAUSTED';
  agentBreakdown: Record<string, { requests: number; tokens: number; percentage: number }>;
}

interface Props {
  usage: AIUsageSummary | null;
  onOpenHistory: () => void;
  onOpenConfig: () => void;
}

export const AIUsageDashboard: React.FC<Props> = ({ usage, onOpenHistory, onOpenConfig }) => {
  const statusColor =
    usage?.status === 'HEALTHY'
      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : usage?.status === 'THROTTLED'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  const formatNum = (num?: number) => (num !== undefined && num !== null ? num.toLocaleString() : '0');

  return (
    <div className="glass-panel p-6 mb-8 border border-slate-800 rounded-2xl bg-slate-900/60 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🤖</span>
            <h2 className="text-xl font-bold text-slate-100 tracking-wide">Gemini AI Usage & Telemetry</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColor}`}>
              ● {usage?.status || 'HEALTHY'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time provider telemetry, sliding quota window, and token pricing model
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenHistory}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            📋 Request Log
          </button>
          <button
            onClick={onOpenConfig}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg border border-indigo-400/40 shadow-lg shadow-indigo-500/20 transition"
          >
            ⚙️ AI Config
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Today Requests</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{formatNum(usage?.todayRequests)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Active RPM: {usage?.activeRpm || 0}</div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Input Tokens</span>
          <div className="text-2xl font-bold text-sky-400 mt-1">{formatNum(usage?.todayInputTokens)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Active TPM: {formatNum(usage?.activeTpm)}</div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Output Tokens</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{formatNum(usage?.todayOutputTokens)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Generated Output</div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cached Tokens</span>
          <div className="text-2xl font-bold text-purple-400 mt-1">{formatNum(usage?.todayCachedTokens)}</div>
          <div className="text-[10px] text-slate-500 mt-1">Prompt Cache Hits</div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Estimated Cost</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {usage?.todayEstimatedCostUsd !== null ? `$${usage?.todayEstimatedCostUsd}` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Provider Pricing</div>
        </div>
      </div>

      {/* Agent Breakdown Progress */}
      {usage?.agentBreakdown && Object.keys(usage.agentBreakdown).length > 0 && (
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Token Usage By Agent</h3>
          <div className="space-y-2">
            {Object.entries(usage.agentBreakdown).map(([agent, stats]) => (
              <div key={agent} className="flex items-center space-x-3 text-xs">
                <span className="w-36 text-slate-400 font-mono truncate">{agent}</span>
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, stats.percentage)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-slate-300 font-semibold">{stats.percentage}%</span>
                <span className="w-20 text-right text-slate-500">{formatNum(stats.tokens)} t</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
