'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Image, X, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, image?: string, imageType?: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const wantListeningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setSpeechSupported(supported);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setImage(base64);
      setImageType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if (!text.trim() && !image) return;
    onSend(text.trim(), image || undefined, imageType || undefined);
    setText('');
    setImage(null);
    setImageType('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stopListening = () => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Try Chrome on desktop.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        // Reset silence timer on every result
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // Auto-stop after 4s of silence
          stopListening();
        }, 4000);

        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setText(finalTranscript + interim);
      };

      recognition.onend = () => {
        // If we still want to be listening (user didn't tap stop),
        // restart recognition (handles browser auto-stop on mobile)
        if (wantListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            wantListeningRef.current = false;
          }
        } else {
          setIsListening(false);
          if (finalTranscript) {
            setText(finalTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.log('[SpeechRecognition] error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.');
          wantListeningRef.current = false;
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // No speech detected — keep listening if user hasn't stopped
          // recognition.onend will handle restart
        } else {
          wantListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      wantListeningRef.current = true;
      recognition.start();
      setIsListening(true);

      // Set initial silence timer
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, 6000);
    } catch {
      setIsListening(false);
      wantListeningRef.current = false;
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="border-t border-[#e5e7eb] bg-white p-3">
      {image && (
        <div className="mb-2 flex items-center gap-2">
          <img
            src={`data:${imageType};base64,${image}`}
            alt="Preview"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <button
            onClick={() => { setImage(null); setImageType(''); }}
            className="rounded-full bg-[#f0f1f3] p-1 hover:bg-gray-200"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {isListening && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#ef4444]/100 animate-pulse" />
          <span className="text-xs font-medium text-[#ef4444]">Listening... tap mic to stop</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-[#f0f1f3] p-2.5 text-[#9ca3af] hover:text-[#111827] hover:bg-gray-200 transition-colors"
          disabled={disabled}
        >
          <Image size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        {speechSupported && (
          <button
            onClick={toggleVoice}
            disabled={disabled}
            className={`rounded-lg p-2.5 transition-colors ${
              isListening
                ? 'bg-[#ef4444]/100 text-white animate-pulse'
                : 'bg-[#f0f1f3] text-[#9ca3af] hover:text-[#111827] hover:bg-gray-200'
            }`}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : 'Ask your coach...'}
          rows={1}
          disabled={disabled}
          className={`flex-1 resize-none rounded-xl border bg-[#f0f1f3] px-4 py-2.5 text-sm text-[#111827] placeholder-[#4b5563] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50 ${
            isListening ? 'border-red-400 ring-1 ring-red-400' : 'border-[#e5e7eb]'
          }`}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="rounded-lg bg-[#1e3a5f] p-2.5 text-white transition-colors hover:bg-[#162d4a] disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
