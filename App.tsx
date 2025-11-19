import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender, MessageType, VideoMetadata, AgentState } from './types';
import { VideoUploader } from './components/VideoUploader';
import { ChatMessage } from './components/ChatMessage';
import { AgentStatusPanel } from './components/AgentStatusPanel';
import { CodeInspector } from './components/CodeInspector';
import { mockBackend } from './services/mockBackend';
import { MessageSquare, Plus, Send, Settings, Menu, Box, Code2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentVideo, setCurrentVideo] = useState<VideoMetadata | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([
    { name: 'Orchestrator', status: 'idle', progress: 0 },
    { name: 'Transcription Agent', status: 'idle', progress: 0 },
    { name: 'Vision Agent', status: 'idle', progress: 0 },
    { name: 'Generation Agent', status: 'idle', progress: 0 },
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load initial greeting
  useEffect(() => {
    const initialMsg: Message = {
      id: 'init',
      sender: Sender.Bot,
      type: MessageType.Text,
      content: "Hello! I am your **LocalGenAI** assistant. I run entirely offline using OpenVINO agents. Please upload an MP4 video to get started.",
      timestamp: Date.now(),
    };
    setMessages([initialMsg]);
  }, []);

  // Scroll to bottom on message change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      type: MessageType.Text,
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Call backend
    await mockBackend.processQuery(
      text,
      currentVideo?.name,
      (newAgents) => setAgents(newAgents),
      (responseMsg) => setMessages(prev => [...prev, responseMsg])
    );
  };

  const handleClarification = (value: string) => {
    handleSend(value);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      <CodeInspector isOpen={isCodeInspectorOpen} onClose={() => setIsCodeInspectorOpen(false)} />

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden shrink-0`}>
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
           <Box className="text-primary-500" />
           <h1 className="font-bold text-lg tracking-tight">LocalGenAI</h1>
        </div>
        
        <div className="p-4">
          <button 
            onClick={() => {
                setCurrentVideo(null);
                setMessages([{
                    id: Date.now().toString(),
                    sender: Sender.Bot,
                    type: MessageType.Text,
                    content: "Ready for a new task. Upload a video to begin.",
                    timestamp: Date.now()
                }]);
            }}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-2.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
          <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">History</h3>
          {/* Mock History Items */}
          <div className="space-y-1">
            {['Meeting_Summary_Q3.mp4', 'Lab_Test_Results.mp4', 'Site_Inspection.mp4'].map((item, i) => (
              <button key={i} className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-800 text-sm text-slate-400 hover:text-slate-200 truncate flex items-center gap-2">
                <MessageSquare size={14} />
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
           <button 
            onClick={() => setIsCodeInspectorOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
          >
            <Code2 size={14} className="text-primary-400"/>
            View Backend Source
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Settings size={12} />
            <span>Version 0.1.0 (Offline Mode)</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Header (Mobile/Toggle) */}
        <div className="h-14 border-b border-slate-800 flex items-center px-4 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-md text-slate-400 mr-4"
          >
            <Menu size={20} />
          </button>
          <h2 className="font-medium text-slate-200">
            {currentVideo ? currentVideo.name : 'No Video Selected'}
          </h2>
          {currentVideo && (
             <span className="ml-3 px-2 py-0.5 bg-green-900/30 text-green-500 text-xs border border-green-900/50 rounded-full">
                Ready
             </span>
          )}
        </div>

        {/* Workspace Split */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: Video & Visuals */}
          <div className="lg:w-[45%] p-4 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900">
            <div className="flex-1 min-h-[250px] lg:min-h-0">
              <VideoUploader 
                currentVideo={currentVideo} 
                onVideoSelect={(file, meta) => setCurrentVideo(meta)}
                onClear={() => setCurrentVideo(null)}
              />
            </div>
            {/* Agent Status Panel lives here on desktop, below video */}
            <div className="shrink-0">
               <AgentStatusPanel agents={agents} />
            </div>
          </div>

          {/* Right: Chat Interface */}
          <div className="flex-1 flex flex-col bg-slate-950 relative">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth custom-scrollbar"
            >
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onClarificationSelect={handleClarification}
                />
              ))}
              {/* Processing Indicator */}
              {agents.some(a => a.status === 'working') && (
                <div className="flex items-center gap-2 text-slate-500 text-sm ml-12 animate-pulse">
                   <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></span>
                   <span>Analyzing video content...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <div className="relative max-w-4xl mx-auto">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={currentVideo ? "Ask about the video (e.g., 'Transcribe', 'Find objects', 'Generate PDF')..." : "Upload a video first..."}
                  disabled={!currentVideo || agents.some(a => a.status === 'working')}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-600"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!currentVideo || !input.trim() || agents.some(a => a.status === 'working')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-600 mt-2">
                Local AI model execution may vary based on hardware (CPU/NPU).
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;