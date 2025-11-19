export enum Sender {
  User = 'user',
  Bot = 'bot',
  System = 'system',
}

export enum MessageType {
  Text = 'text',
  Clarification = 'clarification',
  File = 'file',
  Error = 'error',
}

export interface ClarificationOption {
  id: string;
  label: string;
  value: string;
}

export interface Message {
  id: string;
  sender: Sender;
  type: MessageType;
  content: string;
  timestamp: number;
  clarificationOptions?: ClarificationOption[];
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  lastModified: number;
}

export interface VideoMetadata {
  name: string;
  url: string;
  size: number;
  duration?: number;
}

// Types for our simulated local agents
export type AgentName = 'Orchestrator' | 'Transcription Agent' | 'Vision Agent' | 'Generation Agent';

export type AgentStatus = 'idle' | 'working' | 'success' | 'error';

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  currentTask?: string;
  progress: number; // 0-100
}
