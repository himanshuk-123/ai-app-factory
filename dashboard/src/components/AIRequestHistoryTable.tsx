import React, { useState, useEffect } from 'react';

export interface UsageRecord {
  requestId: string;
  projectId?: string;
  agent: string;
  task: string;
  model: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
  retryCount: number;
  estimatedCostUsd: number | null;
  status: 'SUCCESS' | 'FAILED' | 'QUOTA_EXHAUSTED' | 'THROTTLED';
  error?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AIRequestHistoryTable: React.FC<Props> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<UsageRecord[]>([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (agentFilter) query.append('agent', agentFilter);
      if (statusFilter) query.append('status', statusFilter);

      const res = await fetch(`/api/ai/history?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch AI history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, agentFilter, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>📋</span> AI Request History & Telemetry Log
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Detailed audit trail of model routing, latency, token consumption, and retry counts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-950/30 border-b border-slate-800/80 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Filter by agent..."
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="QUOTA_EXHAUSTED">QUOTA_EXHAUSTED</option>
            <option value="THROTTLED">THROTTLED</option>
          </select>

          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading telemetry records...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No AI request logs match the criteria.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-950/50">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3 text-right">In Tokens</th>
                  <th className="py-2.5 px-3 text-right">Out Tokens</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                  <th className="py-2.5 px-3 text-center">Retries</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.map((record) => (
                  <tr key={record.requestId} className="hover:bg-slate-800/30 transition font-mono">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(record.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{record.agent}</td>
                    <td className="py-2.5 px-3 text-indigo-400">{record.task}</td>
                    <td className="py-2.5 px-3 text-slate-300">{record.model}</td>
                    <td className="py-2.5 px-3 text-right text-sky-400">{record.inputTokens.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{record.outputTokens.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{record.durationMs}ms</td>
                    <td className="py-2.5 px-3 text-center text-amber-400">{record.retryCount}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          record.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
