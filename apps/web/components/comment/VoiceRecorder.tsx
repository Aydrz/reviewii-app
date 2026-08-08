'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import { uploadFileApi } from '../../lib/api-client';
import { useToast } from '../Toast';

interface VoiceRecorderProps {
  guestToken?: string;
  onVoiceRecorded: (voiceUrl: string) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ guestToken, onVoiceRecorded, onCancel }: VoiceRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error('Akses mikrofon ditolak atau tidak didukung pada perangkat ini.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBlob) return;
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_comment.webm');
      const endpoint = guestToken ? `/guest/${guestToken}/upload-voice` : `/guest/default/upload-voice`;
      const res = await uploadFileApi<{ voice_url: string }>(endpoint, formData);
      onVoiceRecorded(res.voice_url);
    } catch (e) {
      toast.error('Gagal mengupload pesan suara.');
    }
  };

  return (
    <div className="bg-neutral-900 border border-white/10 p-3 rounded-xl flex items-center justify-between gap-3">
      {!recordedAudioUrl ? (
        <>
          <div className="flex items-center gap-3 text-xs text-neutral-300">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-[#EB5757] animate-ping' : 'bg-neutral-600'}`} />
            <span>{isRecording ? `Merekam... ${duration}s / 60s` : 'Tap mic untuk rekam suara (max 60s)'}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="p-2.5 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-full transition-transform active:scale-95"
              >
                <Mic className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="p-2.5 bg-[#EB5757] hover:bg-red-600 text-white rounded-full transition-transform active:scale-95"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
            <button onClick={onCancel} className="p-2 text-neutral-400 hover:text-white">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1">
            <audio src={recordedAudioUrl} controls className="w-full h-8" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendVoice}
              className="p-2.5 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-full flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
            <button onClick={onCancel} className="p-2 text-neutral-400 hover:text-white">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
