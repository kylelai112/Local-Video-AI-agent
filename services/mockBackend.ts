import { Message, MessageType, Sender, AgentState, AgentName } from '../types';

// This service mocks the "gRPC" communication with the local Python backend.
// In a real Tauri app, this would use `invoke` or a gRPC web client.

type AgentUpdateCallback = (states: AgentState[]) => void;
type MessageCallback = (message: Message) => void;

const INITIAL_AGENTS: AgentState[] = [
  { name: 'Orchestrator', status: 'idle', progress: 0 },
  { name: 'Transcription Agent', status: 'idle', progress: 0 },
  { name: 'Vision Agent', status: 'idle', progress: 0 },
  { name: 'Generation Agent', status: 'idle', progress: 0 },
];

export class MockBackendService {
  private agents: AgentState[] = [...INITIAL_AGENTS];

  private updateAgents(callback: AgentUpdateCallback) {
    callback([...this.agents]);
  }

  private setAgentStatus(name: AgentName, status: AgentState['status'], task: string, progress: number, callback: AgentUpdateCallback) {
    this.agents = this.agents.map(a => 
      a.name === name ? { ...a, status, currentTask: task, progress } : a
    );
    this.updateAgents(callback);
  }

  // Simulates processing a query with multi-agent routing
  public async processQuery(
    query: string, 
    videoName: string | undefined, 
    onAgentUpdate: AgentUpdateCallback, 
    onMessage: MessageCallback
  ) {
    const lowerQuery = query.toLowerCase();

    if (!videoName) {
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.Error,
        content: "Please upload a video file first so I can analyze it.",
        timestamp: Date.now(),
      });
      return;
    }

    // Reset Agents
    this.agents = INITIAL_AGENTS.map(a => ({...a, status: 'idle', progress: 0, currentTask: ''}));
    this.updateAgents(onAgentUpdate);

    // 1. Orchestrator Routing
    this.setAgentStatus('Orchestrator', 'working', 'Routing query...', 20, onAgentUpdate);
    await this.delay(800);

    // Human-in-the-loop Simulation: Ambiguity Check
    if (lowerQuery.includes('analyze') || lowerQuery.trim() === 'what is inside?') {
      this.setAgentStatus('Orchestrator', 'success', 'Ambiguity detected', 100, onAgentUpdate);
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.Clarification,
        content: "I can analyze multiple aspects of the video. What specific information do you need?",
        timestamp: Date.now(),
        clarificationOptions: [
          { id: 'c1', label: 'Transcribe Audio', value: 'Transcribe the video' },
          { id: 'c2', label: 'Detect Objects', value: 'What objects are shown in the video?' },
          { id: 'c3', label: 'Summarize Content', value: 'Summarize the discussion and generate a PDF' },
        ]
      });
      return;
    }

    // 2. Dispatch to specific agents based on keywords
    this.setAgentStatus('Orchestrator', 'success', 'Delegating tasks', 100, onAgentUpdate);

    if (lowerQuery.includes('transcribe') || lowerQuery.includes('text') || lowerQuery.includes('said')) {
      await this.runTranscriptionAgent(onAgentUpdate);
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.Text,
        content: `**Transcription Complete:**\n\n[00:00-00:05] "Welcome to the demo of the new local AI architecture."\n[00:05-00:12] "As you can see, the latency is minimal because everything runs on-device using OpenVINO."\n[00:12-00:15] "Let's move on to the object detection module."`,
        timestamp: Date.now(),
      });
    } 
    else if (lowerQuery.includes('object') || lowerQuery.includes('graph') || lowerQuery.includes('visual')) {
      await this.runVisionAgent(onAgentUpdate);
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.Text,
        content: `**Analysis Report:**\n\nI detected the following objects in the video:\n- **Person** (Confidence: 98%) - appearing at 00:02\n- **Laptop** (Confidence: 95%) - appearing at 00:10\n- **Whiteboard** (Confidence: 88%) - containing a flow chart graph.\n\nThe graph appears to depict a neural network architecture with 3 hidden layers.`,
        timestamp: Date.now(),
      });
    }
    else if (lowerQuery.includes('pdf') || lowerQuery.includes('ppt') || lowerQuery.includes('powerpoint') || lowerQuery.includes('summarize')) {
      // Complex workflow: Transcription -> Summarization -> Generation
      await this.runTranscriptionAgent(onAgentUpdate);
      await this.runGenerationAgent(onAgentUpdate);
      
      const fileType = lowerQuery.includes('ppt') || lowerQuery.includes('powerpoint') ? 'PPTX' : 'PDF';
      
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.File,
        content: `I have generated the ${fileType} report summarizing the key points discussed in the video.`,
        attachmentName: `Video_Summary_Report.${fileType.toLowerCase()}`,
        attachmentUrl: '#', // Mock link
        timestamp: Date.now(),
      });
    } 
    else {
      // Fallback generic response
      this.setAgentStatus('Orchestrator', 'working', 'Processing generic query...', 50, onAgentUpdate);
      await this.delay(1000);
      this.setAgentStatus('Orchestrator', 'success', 'Done', 100, onAgentUpdate);
      onMessage({
        id: Date.now().toString(),
        sender: Sender.Bot,
        type: MessageType.Text,
        content: "I've processed the video context. It seems to be a technical demonstration. You can ask me to transcribe it, find objects, or generate a report.",
        timestamp: Date.now(),
      });
    }
  }

  // Mock Agent Runners
  private async runTranscriptionAgent(cb: AgentUpdateCallback) {
    this.setAgentStatus('Transcription Agent', 'working', 'Extracting audio track...', 20, cb);
    await this.delay(800);
    this.setAgentStatus('Transcription Agent', 'working', 'Running Whisper (OpenVINO)...', 60, cb);
    await this.delay(1200);
    this.setAgentStatus('Transcription Agent', 'success', 'Transcription finalized', 100, cb);
  }

  private async runVisionAgent(cb: AgentUpdateCallback) {
    this.setAgentStatus('Vision Agent', 'working', 'Sampling frames (1fps)...', 10, cb);
    await this.delay(1000);
    this.setAgentStatus('Vision Agent', 'working', 'Running YOLOv8 detection...', 50, cb);
    await this.delay(1500);
    this.setAgentStatus('Vision Agent', 'working', 'Analyzing graph structures...', 80, cb);
    await this.delay(800);
    this.setAgentStatus('Vision Agent', 'success', 'Objects & Text extracted', 100, cb);
  }

  private async runGenerationAgent(cb: AgentUpdateCallback) {
    this.setAgentStatus('Generation Agent', 'working', 'Synthesizing summaries...', 30, cb);
    await this.delay(1000);
    this.setAgentStatus('Generation Agent', 'working', 'Formatting document layout...', 70, cb);
    await this.delay(800);
    this.setAgentStatus('Generation Agent', 'success', 'Document rendered', 100, cb);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockBackend = new MockBackendService();
