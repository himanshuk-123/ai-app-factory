import React, { useState, useEffect } from 'react';

export interface AIConfigState {
  defaultModel: string;
  fastModel: string;
  codeModel: string;
  visionModel: string;
  maxRetries: number;
  rpmLimit: number | null;
  tpmLimit: number | null;
  rpdLimit: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AIConfigModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIConfigState>({
    defaultModel: 'gemini-3.6-flash',
    fastModel: 'gemini-3.6-flash',
    codeModel: 'gemini-3.6-flash',
    visionModel: 'gemini-3.6-flash',
    maxRetries: 3,
    rpmLimit: null,
    tpmLimit: null,
    rpdLimit: null,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/config')
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error('Failed to load AI config:', err));
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage('✅ AI Infrastructure configuration updated!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setMessage(`❌ Error saving config: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>⚙️</span> Model Routing & Quota Settings
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure task model mapping and sliding quota thresholds without exposing API secrets
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Default Model
              </label>
              <input
                type="text"
                value={config.defaultModel}
                onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Fast Model
              </label>
              <input
                type="text"
                value={config.fastModel}
                onChange={(e) => setConfig({ ...config, fastModel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Code Model
              </label>
              <input
                type="text"
                value={config.codeModel}
                onChange={(e) => setConfig({ ...config, codeModel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Vision Model
              </label>
              <input
                type="text"
                value={config.visionModel}
                onChange={(e) => setConfig({ ...config, visionModel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value, 10) || 3 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                RPM Limit (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto / Configured"
                value={config.rpmLimit ?? ''}
                onChange={(e) =>
                  setConfig({ ...config, rpmLimit: e.target.value ? parseInt(e.target.value, 10) : null })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {message && <div className="text-xs text-center font-semibold text-emerald-400">{message}</div>}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
