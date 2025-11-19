import React, { useRef, useState } from 'react';
import { Upload, Film, X } from 'lucide-react';
import { VideoMetadata } from '../types';

interface Props {
  onVideoSelect: (file: File, meta: VideoMetadata) => void;
  currentVideo: VideoMetadata | null;
  onClear: () => void;
}

export const VideoUploader: React.FC<Props> = ({ onVideoSelect, currentVideo, onClear }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'video/mp4') {
        const url = URL.createObjectURL(file);
        onVideoSelect(file, {
          name: file.name,
          size: file.size,
          url,
        });
      } else {
        alert('Please select an MP4 file.');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  if (currentVideo) {
    return (
      <div className="relative group rounded-lg overflow-hidden bg-black border border-slate-800 shadow-lg h-full min-h-[200px] flex flex-col">
        <video 
          src={currentVideo.url} 
          controls 
          className="w-full h-full object-contain bg-slate-950"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onClear}
            className="p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-500"
          >
            <X size={14} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <p className="text-xs font-mono text-slate-300 truncate">{currentVideo.name}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        h-full min-h-[240px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all
        ${dragActive 
          ? 'border-primary-500 bg-primary-500/10' 
          : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mp4"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="p-4 bg-slate-800/50 rounded-full mb-4 text-primary-400">
        <Upload size={32} />
      </div>
      <p className="text-sm font-medium text-slate-300 mb-1">Click or Drag .mp4 here</p>
      <p className="text-xs text-slate-500">Supported format: MP4 (H.264)</p>
      
      {/* decorative elements to look like the requirements */}
      <div className="flex gap-2 mt-6 opacity-50">
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400">
           <Film size={10} /> Max 100MB
        </div>
      </div>
    </div>
  );
};
