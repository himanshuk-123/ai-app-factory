import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileCode2, Search, Loader2 } from 'lucide-react';

interface ArtifactModalProps {
  artifactName: string | null;
  projectId: string;
  onClose: () => void;
}

export const ArtifactModal: React.FC<ArtifactModalProps> = ({ artifactName, projectId, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!artifactName || !projectId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/projects/${projectId}/artifacts/${artifactName}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Artifact HTTP status ${res.status}`);
        return res.text();
      })
      .then((data) => {
        try {
          // Format JSON if possible
          const parsed = JSON.parse(data);
          setContent(JSON.stringify(parsed, null, 2));
        } catch {
          setContent(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load artifact: ${err.message}`);
        setLoading(false);
      });
  }, [artifactName, projectId]);

  if (!artifactName) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel p-6 max-w-4xl w-full h-[80vh] flex flex-col justify-between border-slate-700 shadow-2xl space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">{artifactName}</h3>
              <p className="text-[11px] font-mono text-slate-400">projects/{projectId}/{artifactName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={loading || !!error}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copied ? 'Copied!' : 'Copy Content'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 relative">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Loading artifact content...</span>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-400 p-4 text-center">
              {error}
            </div>
          ) : (
            <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words leading-relaxed selection:bg-indigo-500 selection:text-white">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
