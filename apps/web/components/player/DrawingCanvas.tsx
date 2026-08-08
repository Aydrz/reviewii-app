'use client';

import { useRef, useState, useEffect } from 'react';
import { Trash2, Check, PenTool, X } from 'lucide-react';

interface DrawingCanvasProps {
  frameImageUrl?: string | null;
  onSaveDrawing: (dataUrl: string) => void;
  onClose: () => void;
}

export default function DrawingCanvas({ frameImageUrl, onSaveDrawing, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563FF');
  const [lineWidth, setLineWidth] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parentWidth = canvas.parentElement?.clientWidth || 800;
    const parentHeight = canvas.parentElement?.clientHeight || 450;
    canvas.width = parentWidth;
    canvas.height = parentHeight;

    if (frameImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, parentWidth, parentHeight);
      };
      img.src = frameImageUrl;
    }
  }, [frameImageUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (frameImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = frameImageUrl;
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSaveDrawing(canvas.toDataURL('image/png'));
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col justify-between p-3 sm:p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900/95 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/10 z-50">
        <div className="flex items-center gap-3">
          <PenTool className="w-5 h-5 text-[#2563FF]" />
          <div className="flex gap-1.5 sm:gap-2">
            {['#2563FF', '#EC4899', '#2ECC71', '#F5A623', '#FFFFFF', '#EB5757'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 border border-white/10 transition-colors"
            title="Keluar tanpa menyimpan coretan"
          >
            <X className="w-4 h-4 text-neutral-400" /> Batal / Keluar
          </button>
          <button onClick={clearCanvas} className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 border border-white/10 transition-colors">
            <Trash2 className="w-4 h-4 text-[#EB5757]" /> Bersihkan
          </button>
          <button onClick={handleSave} className="px-3.5 py-1.5 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-colors">
            <Check className="w-4 h-4" /> Simpan Coretan
          </button>
        </div>
      </div>

      {/* Interactive Frame Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full h-full cursor-crosshair touch-none"
      />
    </div>
  );
}
