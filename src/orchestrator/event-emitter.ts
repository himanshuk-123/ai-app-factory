import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface WorkflowEvent {
  id: string;
  projectId: string;
  stage: number; // 1 to 13
  agent: string; // e.g. "Idea Validation", "Market Research", etc.
  type:
    | 'WORKFLOW_STARTED'
    | 'AGENT_STARTED'
    | 'AGENT_PROGRESS'
    | 'LOG'
    | 'ARTIFACT_CREATED'
    | 'AGENT_COMPLETED'
    | 'AGENT_FAILED'
    | 'WORKFLOW_COMPLETED'
    | 'WORKFLOW_FAILED';
  status?: 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'SKIPPED';
  message?: string;
  progress?: number; // 0 to 100
  artifactPath?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export class FactoryEventEmitter extends EventEmitter {
  private static instance: FactoryEventEmitter;
  private eventsLogMap: Map<string, WorkflowEvent[]> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): FactoryEventEmitter {
    if (!FactoryEventEmitter.instance) {
      FactoryEventEmitter.instance = new FactoryEventEmitter();
    }
    return FactoryEventEmitter.instance;
  }

  public async emitWorkflowEvent(event: Omit<WorkflowEvent, 'id' | 'timestamp'>): Promise<WorkflowEvent> {
    const fullEvent: WorkflowEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    // Store in memory for project
    if (!this.eventsLogMap.has(fullEvent.projectId)) {
      this.eventsLogMap.set(fullEvent.projectId, []);
    }
    const projectEvents = this.eventsLogMap.get(fullEvent.projectId)!;
    projectEvents.push(fullEvent);

    // Emit event for SSE subscribers
    this.emit(`event:${fullEvent.projectId}`, fullEvent);
    this.emit('event:global', fullEvent);

    // Persist asynchronously to projects/<projectId>/workflow-events.json
    try {
      const projectFolder = path.resolve(process.cwd(), 'projects', fullEvent.projectId);
      await fs.mkdir(projectFolder, { recursive: true });
      const eventsFile = path.join(projectFolder, 'workflow-events.json');
      await fs.writeFile(eventsFile, JSON.stringify(projectEvents, null, 2), 'utf-8');
    } catch {
      // Ignore file write errors during event emission
    }

    return fullEvent;
  }

  public async getProjectEvents(projectId: string): Promise<WorkflowEvent[]> {
    if (this.eventsLogMap.has(projectId)) {
      return this.eventsLogMap.get(projectId)!;
    }

    // Try reading from file
    try {
      const eventsFile = path.resolve(process.cwd(), 'projects', projectId, 'workflow-events.json');
      const data = await fs.readFile(eventsFile, 'utf-8');
      const events = JSON.parse(data) as WorkflowEvent[];
      this.eventsLogMap.set(projectId, events);
      return events;
    } catch {
      return [];
    }
  }
}

export const factoryEvents = FactoryEventEmitter.getInstance();
