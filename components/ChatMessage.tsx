import React from 'react';
import { Message, MessageType, Sender } from '../types';
import { Bot, User, FileText, Download, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  message: Message;
  onClarificationSelect: (value: string) => void;
}

export const ChatMessage: React.FC<Props> = ({ message, onClarificationSelect }) => {
  const isUser = message.sender === Sender.User;

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isUser ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'}
      `}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end flex flex-col' : ''}`}>
        <div className={`
          rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
          ${isUser 
            ? 'bg-primary-600 text-white rounded-tr-sm' 
            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'}
        `}>
          {message.type === MessageType.Text && (
            <div className="markdown-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}

          {message.type === MessageType.Error && (
             <p className="text-red-400 font-medium">{message.content}</p>
          )}

          {message.type === MessageType.File && (
            <div className="flex flex-col gap-2">
              <p className="mb-2">{message.content}</p>
              <div className="flex items-center gap-3 p-3 rounded bg-slate-900/50 border border-slate-700/50 hover:border-primary-500/50 transition-colors group cursor-pointer">
                <div className="p-2 bg-red-500/10 rounded text-red-400">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-200">{message.attachmentName}</p>
                  <p className="text-xs text-slate-500">1.2 MB • Generated via Local Model</p>
                </div>
                <button className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white">
                  <Download size={18} />
                </button>
              </div>
            </div>
          )}

          {message.type === MessageType.Clarification && (
             <div>
               <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium">
                 <HelpCircle size={16} />
                 <span>Clarification Needed</span>
               </div>
               <p className="mb-4">{message.content}</p>
               <div className="flex flex-wrap gap-2">
                 {message.clarificationOptions?.map((opt) => (
                   <button
                     key={opt.id}
                     onClick={() => onClarificationSelect(opt.value)}
                     className="px-3 py-1.5 bg-slate-900 hover:bg-primary-600 border border-slate-600 hover:border-primary-500 rounded-full text-xs transition-all text-slate-300 hover:text-white"
                   >
                     {opt.label}
                   </button>
                 ))}
               </div>
             </div>
          )}
        </div>
        
        <span className="text-[10px] text-slate-500 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
