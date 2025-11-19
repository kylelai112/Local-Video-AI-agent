import React from 'react';
import { AgentState } from '../types';
import { Activity, CheckCircle2, Circle, Cpu, FileText, Image as ImageIcon, Layers } from 'lucide-react';

interface Props {
  agents: AgentState[];
}

const AgentIcon: React.FC<{ name: string, className?: string }> = ({ name, className }) => {
  switch (name) {
    case 'Orchestrator': return <Cpu className={className} />;
    case 'Transcription Agent': return <Activity className={className} />;
    case 'Vision Agent': return <ImageIcon className={className} />;
    case 'Generation Agent': return <FileText className={className} />;
    default: return <Layers className={className} />;
  }
};

export const AgentStatusPanel: React.FC<Props> = ({ agents }) => {
  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Agent Runtime</h3>
        <span className="text-[10px] bg-primary-900/50 text-primary-400 px-2 py-0.5 rounded border border-primary-800">
          OpenVINO Backend Active
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agents.map((agent) => (
          <div 
            key={agent.name} 
            className={`
              relative overflow-hidden rounded-lg border p-3 transition-all duration-300
              ${agent.status === 'working' 
                ? 'bg-slate-800/80 border-primary-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                : 'bg-slate-900 border-slate-800'}
              ${agent.status === 'success' ? 'border-green-500/30' : ''}
            `}
          >
            {/* Progress Bar Background */}
            {agent.status === 'working' && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-300" 
                style={{ width: `${agent.progress}%` }}
              />
            )}

            <div className="flex items-center gap-3 mb-2">
              <div className={`
                p-2 rounded-md 
                ${agent.status === 'working' ? 'bg-primary-500/20 text-primary-400' : 'bg-slate-800 text-slate-500'}
                ${agent.status === 'success' ? 'bg-green-500/20 text-green-400' : ''}
              `}>
                <AgentIcon name={agent.name} className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{agent.name}</p>
                <div className="flex items-center gap-1.5">
                  {agent.status === 'working' && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse"></span>}
                  {agent.status === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
                  {agent.status === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>}
                  <p className="text-xs text-slate-400 truncate">
                    {agent.status === 'idle' ? 'Standby' : agent.currentTask || agent.status}
                  </p>
                </div>
              </div>
              {agent.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {agent.status === 'idle' && <Circle className="w-4 h-4 text-slate-700" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
