import React, { useState } from 'react';
import { X, Copy, FileCode, Server, Terminal } from 'lucide-react';

// Mapping of filenames to the actual code content (since we can't read disk in browser)
const CODE_FILES: Record<string, string> = {
  'backend/agents/transcription_agent.py': `import time
from pathlib import Path
from optimum.intel import OVModelForSpeechSeq2Seq
from transformers import AutoProcessor, pipeline

class TranscriptionAgent:
    def __init__(self, model_id="distil-whisper/distil-medium.en"):
        print(f"[Transcription Agent] Loading OpenVINO Optimized model: {model_id}...")
        
        # Load model exported for OpenVINO
        self.model = OVModelForSpeechSeq2Seq.from_pretrained(model_id, export=True)
        self.processor = AutoProcessor.from_pretrained(model_id)
        
        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=self.model,
            tokenizer=self.processor.tokenizer,
            max_new_tokens=128,
            chunk_length_s=15,
            batch_size=16,
        )

    def process(self, video_path: str):
        # OpenVINO accelerated inference
        result = self.pipe(video_path)
        return {"text": result["text"]}`,

  'backend/agents/vision_agent.py': `import cv2
from ultralytics import YOLO

class VisionAgent:
    def __init__(self, model_path="yolov8n.pt"):
        print(f"[Vision Agent] Loading YOLO model...")
        self.model = YOLO(model_path)
        
        # Export to OpenVINO format for NPU/CPU acceleration
        try:
            self.model.export(format="openvino")
            self.model = YOLO(model_path.replace(".pt", "_openvino_model"))
        except Exception as e:
            print("Using standard PyTorch runtime")

    def process(self, video_path: str):
        cap = cv2.VideoCapture(video_path)
        detected_objects = {}
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            # Inference
            results = self.model(frame, verbose=False)
            # ... aggregation logic ...
            
        return detected_objects`,

  'backend/server.py': `import grpc
from agents.transcription_agent import TranscriptionAgent
from agents.vision_agent import VisionAgent

class AnalystService(pb2_grpc.AnalystServiceServicer):
    def __init__(self):
        self.transcriber = TranscriptionAgent()
        self.vision = VisionAgent()

    def AnalyzeQuery(self, request, context):
        # Orchestrate agents based on query
        if "transcribe" in request.query_text:
             yield self.transcriber.process(request.video_id)
        elif "object" in request.query_text:
             yield self.vision.process(request.video_id)
`
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeInspector: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeFile, setActiveFile] = useState<string>('backend/agents/transcription_agent.py');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-slate-200">
            <Server size={18} className="text-primary-500" />
            <h2 className="font-semibold">Backend Source Inspector</h2>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">Read-Only</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar File List */}
          <div className="w-64 bg-slate-925 border-r border-slate-800 flex flex-col">
            <div className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Python Files
            </div>
            {Object.keys(CODE_FILES).map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`
                  text-left px-4 py-2.5 text-sm flex items-center gap-2 truncate transition-colors
                  ${activeFile === file 
                    ? 'bg-primary-900/20 text-primary-400 border-r-2 border-primary-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                `}
              >
                <FileCode size={14} />
                {file.split('/').pop()}
              </button>
            ))}
          </div>

          {/* Code Content */}
          <div className="flex-1 bg-[#0d1117] overflow-auto custom-scrollbar relative">
             <div className="absolute top-4 right-4">
               <button className="p-1.5 bg-slate-800 text-slate-400 rounded hover:text-white">
                 <Copy size={14} />
               </button>
             </div>
             <pre className="p-6 text-sm font-mono leading-relaxed text-slate-300">
               <code className="language-python">
                 {CODE_FILES[activeFile]}
               </code>
             </pre>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
           <Terminal size={12} />
           <span>Showing source for local OpenVINO/PyTorch implementation.</span>
        </div>
      </div>
    </div>
  );
};
