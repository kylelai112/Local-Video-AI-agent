import React, { useState } from 'react';
import { X, Copy, FileCode, Server, Terminal } from 'lucide-react';

// Mapping of filenames to the actual code content for display purposes
const CODE_FILES: Record<string, string> = {
  'backend/proto/service.proto': `syntax = "proto3";

package localgenai;

service AnalystService {
  // Streams updates as agents process the video
  rpc AnalyzeVideo (AnalysisRequest) returns (stream AnalysisResponse);
  
  // Check backend health/status
  rpc GetStatus (Empty) returns (StatusResponse);
}

message Empty {}

message AnalysisRequest {
  string file_path = 1;
  string query = 2;
  string session_id = 3;
}

message AnalysisResponse {
  string agent_name = 1; // e.g., "Transcription Agent"
  string status = 2;     // "working", "success", "error"
  string message = 3;    // "Loading OpenVINO model...", "Found 3 objects"
  int32 progress = 4;    // 0-100
  string payload_json = 5; // Final results in JSON format
}

message StatusResponse {
  bool ready = 1;
  string active_device = 2; // e.g., "Intel GPU", "CPU"
}`,

  'backend/agents/transcription_agent.py': `import time
import logging
import os
from pathlib import Path
try:
    from optimum.intel import OVModelForSpeechSeq2Seq
    from transformers import AutoProcessor, pipeline
except ImportError:
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TranscriptionAgent")

class TranscriptionAgent:
    def __init__(self, model_id="distil-whisper/distil-medium.en"):
        self.model_id = model_id
        self.pipeline = None
        self.model = None

    def _initialize_model(self):
        if self.pipeline: return
        logger.info(f"Loading OpenVINO model: {self.model_id}")
        try:
            self.model = OVModelForSpeechSeq2Seq.from_pretrained(
                self.model_id, export=True, device="CPU"
            )
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            self.pipeline = pipeline(
                "automatic-speech-recognition",
                model=self.model,
                tokenizer=self.processor.tokenizer,
                feature_extractor=self.processor.feature_extractor,
                max_new_tokens=128,
            )
            logger.info("Transcription Agent Ready (OpenVINO backend)")
        except Exception as e:
            logger.error(f"Failed to initialize OpenVINO model: {e}")

    def process(self, video_path: str, progress_callback=None) -> dict:
        self._initialize_model()
        logger.info(f"Processing video: {video_path}")
        start_time = time.time()
        if progress_callback:
            progress_callback("Extracting audio & running inference...", 20)

        try:
            result = self.pipeline(video_path, return_timestamps=True)
            text_output = result.get("text", "")
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            text_output = "Error during transcription processing."

        return {
            "text": text_output,
            "metadata": { "backend": "OpenVINO", "latency": time.time() - start_time }
        }`,

  'backend/agents/vision_agent.py': `import cv2
import logging
import time
from collections import Counter
try:
    from ultralytics import YOLO
except ImportError:
    pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VisionAgent")

class VisionAgent:
    def __init__(self, model_path="yolov8n.pt"):
        self.model_path = model_path
        self.model = None

    def _initialize_model(self):
        if self.model: return
        logger.info("Loading Vision Agent (YOLOv8)...")
        try:
            self.model = YOLO(self.model_path)
            # self.model.export(format="openvino") # Export on first run
            logger.info("Vision Agent Ready")
        except Exception as e:
            logger.error(f"Failed to initialize Vision Agent: {e}")

    def process(self, video_path: str, query_context: str = None, progress_callback=None) -> dict:
        self._initialize_model()
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): return {"error": "Could not open video file"}

        detections = []
        frame_idx = 0
        fps = cap.get(cv2.CAP_PROP_FPS)
        sample_rate = int(fps) if fps > 0 else 30
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
                
            if frame_idx % sample_rate == 0:
                results = self.model(frame, verbose=False)
                for r in results:
                    for box in r.boxes:
                        if float(box.conf[0]) > 0.5:
                            detections.append({
                                "label": self.model.names[int(box.cls[0])],
                                "confidence": float(box.conf[0])
                            })
            frame_idx += 1
            
        cap.release()
        counts = Counter([d['label'] for d in detections])
        return { "summary": f"Detected: {list(counts.keys())}", "object_counts": dict(counts) }`,

  'backend/agents/generation_agent.py': `import logging
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from pptx import Presentation
except ImportError:
    pass

logger = logging.getLogger("GenerationAgent")

class GenerationAgent:
    def __init__(self):
        try: self.styles = getSampleStyleSheet()
        except: self.styles = None

    def create_pdf(self, analysis_data: dict, output_path: str = "report.pdf"):
        logger.info(f"Generating PDF to {output_path}...")
        if not self.styles: return "error.pdf"

        doc = SimpleDocTemplate(output_path, pagesize=letter)
        story = []
        story.append(Paragraph("Video Analysis Report", self.styles['Title']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(analysis_data.get('summary', ''), self.styles['Normal']))

        try:
            doc.build(story)
            return output_path
        except Exception as e:
            logger.error(f"PDF failed: {e}")
            return None

    def create_pptx(self, analysis_data: dict, output_path: str = "presentation.pptx"):
        logger.info("Generating PowerPoint...")
        try: prs = Presentation()
        except: return "error.pptx"
        
        slide = prs.slides.add_slide(prs.slide_layouts[0])
        slide.shapes.title.text = "Video Analysis"
        slide.placeholders[1].text = "Generated by LocalGenAI"
        prs.save(output_path)
        return output_path`,
        
  'backend/server.py': `import grpc
from concurrent import futures
import json
import logging
try:
    import proto.service_pb2 as pb2
    import proto.service_pb2_grpc as pb2_grpc
except ImportError:
    pb2, pb2_grpc = None, None

from agents.transcription_agent import TranscriptionAgent
from agents.vision_agent import VisionAgent
from agents.generation_agent import GenerationAgent

class AnalystService:
    def __init__(self):
        self.transcriber = TranscriptionAgent()
        self.vision = VisionAgent()
        self.generator = GenerationAgent()

    def AnalyzeVideo(self, request, context):
        query = request.query.lower()
        video_path = request.file_path
        results = {}
        
        # Logic for Vision, Audio, and Generation pipelines...
        # (See full implementation in backend files)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    if pb2_grpc:
        pb2_grpc.add_AnalystServiceServicer_to_server(AnalystService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()`
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
          <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Python Files
            </div>
            {Object.keys(CODE_FILES).map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`
                  text-left px-4 py-2.5 text-sm flex items-center gap-2 truncate transition-colors w-full
                  ${activeFile === file 
                    ? 'bg-primary-900/20 text-primary-400 border-r-2 border-primary-500' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                `}
              >
                <FileCode size={14} className="shrink-0" />
                <span className="truncate">{file.split('/').pop()}</span>
              </button>
            ))}
          </div>

          {/* Code Content */}
          <div className="flex-1 bg-[#0d1117] overflow-auto relative custom-scrollbar">
             <div className="absolute top-4 right-4 z-10">
               <button className="p-1.5 bg-slate-800 text-slate-400 rounded hover:text-white hover:bg-slate-700 transition-colors">
                 <Copy size={14} />
               </button>
             </div>
             <pre className="p-6 text-sm font-mono leading-relaxed text-slate-300 tab-4">
               <code className="language-python block">
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
