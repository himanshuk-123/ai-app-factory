import React, { useEffect, useState, useMemo } from 'react';
import {
  Factory,
  Plus,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import type { ProjectData, WorkflowStageNode, WorkflowEvent, ProjectMetadata } from './types';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { LiveActivityPanel } from './components/LiveActivityPanel';
import { ProjectOutputSummary } from './components/ProjectOutputSummary';
import { AgentDetailDrawer } from './components/AgentDetailDrawer';
import { ArtifactModal } from './components/ArtifactModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { AIUsageDashboard } from './components/AIUsageDashboard';
import { AIRequestHistoryTable } from './components/AIRequestHistoryTable';
import { AIConfigModal } from './components/AIConfigModal';

const STAGE_DEFINITIONS = [
  { number: 1, id: 'idea-validator', name: 'Idea Validation', agent: 'Idea Validation Agent', iconName: 'Lightbulb', shortDesc: 'Validates app market viability & tech stack feasibility' },
  { number: 2, id: 'market-research', name: 'Market Research', agent: 'Market Research Agent', iconName: 'Search', shortDesc: 'Analyzes market competitors & target audience trends' },
  { number: 3, id: 'product-strategist', name: 'Product Strategist', agent: 'Product Strategist Agent', iconName: 'Target', shortDesc: 'Generates detailed product specification & MVP features' },
  { number: 4, id: 'ux-architect', name: 'UX Architect', agent: 'UX Architect Agent', iconName: 'Layout', shortDesc: 'Architects user flows, navigation & wireframes' },
  { number: 5, id: 'stitch-designer', name: 'Stitch Designer', agent: 'Stitch Designer Agent', iconName: 'Palette', shortDesc: 'Generates UI design system & visual screen specs' },
  { number: 6, id: 'web-generator', name: 'Web Generator', agent: 'Web Generator Agent', iconName: 'Code2', shortDesc: 'Generates production React + Vite web codebase' },
  { number: 7, id: 'mobile-generator', name: 'Mobile Generator', agent: 'Mobile Generator Agent', iconName: 'Smartphone', shortDesc: 'Generates Expo React Native mobile codebase' },
  { number: 8, id: 'build-debugger', name: 'Build & Debug', agent: 'Build & Debug Agent', iconName: 'Wrench', shortDesc: 'TypeScript compilation & build verification' },
  { number: 9, id: 'apk-builder', name: 'APK Builder', agent: 'APK Builder Agent', iconName: 'Package', shortDesc: 'Builds Android APK package via Expo EAS Cloud' },
  { number: 10, id: 'android-qa', name: 'Android QA', agent: 'Android QA Agent', iconName: 'Bot', shortDesc: 'ADB UI & device logcat testing on physical device' },
  { number: 11, id: 'visual-qa', name: 'Visual QA', agent: 'Visual QA Agent', iconName: 'Eye', shortDesc: 'Multimodal Vision comparison against Stitch reference' },
  { number: 12, id: 'visual-auto-fix', name: 'Visual Auto-Fix', agent: 'Visual Auto-Fix Agent', iconName: 'Sparkles', shortDesc: 'Applies AI design repair iterations to source code' },
  { number: 13, id: 'web-qa-deployer', name: 'Web QA & Deploy', agent: 'Web QA & Render Deployer', iconName: 'Globe', shortDesc: 'Web QA, GitHub repository push & Render cloud release' },
];

export function App() {
  const [projectsList, setProjectsList] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [liveEvents, setLiveEvents] = useState<WorkflowEvent[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowStageNode | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [aiUsage, setAiUsage] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Fetch AI usage telemetry
  const fetchAiUsage = async () => {
    try {
      const res = await fetch('/api/ai/usage');
      if (res.ok) {
        const data = await res.json();
        setAiUsage(data);
      }
    } catch (err) {
      console.error('Error fetching AI usage:', err);
    }
  };

  useEffect(() => {
    fetchAiUsage();
    const interval = setInterval(fetchAiUsage, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Fetch project list on mount
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return;
      const data: ProjectMetadata[] = await res.json();
      setProjectsList(data);

      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching projects list:', err);
    }
  };

  useEffect(() => {
    fetchProjects().finally(() => setIsLoading(false));
  }, []);

  // 2. Fetch project details when selectedProjectId changes
  const fetchProjectDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) return;
      const data: ProjectData = await res.json();
      setProjectData(data);
      if (data.events) {
        setLiveEvents(data.events);
      }
    } catch (err) {
      console.error(`Error fetching project ${id}:`, err);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  // 3. Connect Server-Sent Events (SSE) stream for live updates
  useEffect(() => {
    if (!selectedProjectId) return;

    const eventSource = new EventSource(`/api/projects/${selectedProjectId}/events`);

    eventSource.onmessage = (e) => {
      try {
        const evt: WorkflowEvent = JSON.parse(e.data);
        setLiveEvents((prev) => {
          if (prev.some((item) => item.id === evt.id)) return prev;
          return [...prev, evt];
        });
        // Re-fetch state details on major events
        if (evt.type === 'AGENT_COMPLETED' || evt.type === 'WORKFLOW_COMPLETED') {
          fetchProjectDetails(selectedProjectId);
        }
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedProjectId]);

  // Derive Stage Nodes state from backend projectData & liveEvents
  const stageNodes: WorkflowStageNode[] = useMemo(() => {
    const reports = projectData?.reports || {};
    const meta: Record<string, any> = projectData?.metadata || {};

    const artifactMapping: Record<number, string | undefined> = {
      1: 'idea-validation.json',
      2: 'market-research.json',
      3: 'product-spec.json',
      4: 'ux-spec.json',
      5: 'stitch-design.json',
      6: 'web/',
      7: 'mobile/',
      8: 'build-debug-report.json',
      9: 'apk-build-report.json',
      10: 'android-qa-report.json',
      11: 'visual-qa-report.json',
      12: 'visual-auto-fix-report.json',
      13: 'render-deployment-report.json',
    };

    return STAGE_DEFINITIONS.map((def) => {
      let status: any = 'WAITING';
      let currentOp: string | undefined;

      // Find latest event for this stage
      const stageEvts = liveEvents.filter((e) => e.stage === def.number);
      const lastEvt = stageEvts[stageEvts.length - 1];

      if (lastEvt) {
        if (lastEvt.status) status = lastEvt.status;
        if (lastEvt.type === 'AGENT_STARTED' || lastEvt.type === 'AGENT_PROGRESS') {
          status = 'RUNNING';
          currentOp = lastEvt.message;
        }
      }

      // Check persistent metadata flags if available
      if (def.number === 1 && meta.ideaValidationComplete) status = 'SUCCESS';
      if (def.number === 2 && meta.marketResearchComplete) status = 'SUCCESS';
      if (def.number === 3 && meta.productSpecComplete) status = 'SUCCESS';
      if (def.number === 4 && meta.uxSpecComplete) status = 'SUCCESS';
      if (def.number === 5 && reports['stitch-design.json']) status = 'SUCCESS';
      if (def.number === 6 && meta.webGenerationComplete) status = 'SUCCESS';
      if (def.number === 7 && meta.mobileGenerationComplete) status = 'SUCCESS';
      if (def.number === 8 && meta.buildDebugComplete) status = 'SUCCESS';
      if (def.number === 9 && meta.apkBuildComplete) status = 'SUCCESS';
      if (def.number === 10 && meta.androidQaComplete) status = 'SUCCESS';
      if (def.number === 11 && meta.visualQaComplete) status = 'SUCCESS';
      if (def.number === 12 && meta.visualAutoFixComplete) status = 'SUCCESS';
      if (def.number === 13 && meta.renderDeploymentComplete) status = 'SUCCESS';

      return {
        ...def,
        status,
        artifactPath: artifactMapping[def.number],
        currentOperation: currentOp,
      };
    });
  }, [projectData, liveEvents]);

  // Calculate Overall Progress
  const completedCount = stageNodes.filter((n) => n.status === 'SUCCESS').length;
  const progressPercent = Math.round((completedCount / 13) * 100);
  const currentRunningNode = stageNodes.find((n) => n.status === 'RUNNING');

  const overallStatus = projectData?.metadata?.status || 'IDLE';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Main Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/30">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              AI App Factory
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.0 Control Center
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Autonomous Multi-Agent Software Development Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Selector */}
          <div className="relative">
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-900 text-xs font-mono font-semibold text-slate-200 border border-slate-700/80 rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.appName || p.id} ({p.id})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Workflow Overall Status Badge */}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {overallStatus}
          </span>

          <button
            onClick={() => {
              fetchProjects();
              if (selectedProjectId) fetchProjectDetails(selectedProjectId);
            }}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Factory State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New App
          </button>
        </div>
      </header>

      {/* 2. Pipeline Overall Progress Bar */}
      <section className="bg-slate-900/60 border-b border-slate-800/60 px-6 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 flex-1 max-w-3xl">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-400">Pipeline Progress:</span>
            <span className="text-indigo-400 font-bold">{progressPercent}%</span>
          </div>

          <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-slate-400 font-mono text-[11px]">
            {completedCount} / 13 stages completed
          </span>
        </div>

        {currentRunningNode && (
          <div className="flex items-center gap-2 text-indigo-300 font-semibold font-mono animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Current: {currentRunningNode.name}...
          </div>
        )}
      </section>

      {/* 3. Main Dashboard Layout (Split View) */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Canvas & Output Summary */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Node Workflow Canvas */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                13-Stage Visual Pipeline Canvas
              </h2>
              <span className="text-[11px] text-slate-400">Click any node to inspect agent state</span>
            </div>

            <WorkflowCanvas
              nodes={stageNodes}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(node) => setSelectedNode(node)}
              onOpenArtifact={(name) => setSelectedArtifact(name)}
            />
          </div>

          {/* AI Usage Dashboard & Telemetry */}
          <AIUsageDashboard
            usage={aiUsage}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenConfig={() => setIsConfigOpen(true)}
          />

          {/* Project Output Summary */}
          <ProjectOutputSummary
            projectData={projectData}
            onOpenArtifact={(name) => setSelectedArtifact(name)}
          />
        </div>

        {/* Right Sidebar: Live Activity Panel */}
        <div className="w-80 lg:w-96 shrink-0">
          <LiveActivityPanel events={liveEvents} isLive={true} />
        </div>
      </main>

      {/* Drawers & Modals */}
      <AgentDetailDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onOpenArtifact={(name) => setSelectedArtifact(name)}
      />

      <ArtifactModal
        artifactName={selectedArtifact}
        projectId={selectedProjectId || ''}
        onClose={() => setSelectedArtifact(null)}
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={() => {
          fetchProjects();
        }}
      />

      <AIRequestHistoryTable
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <AIConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
};

export default App;
