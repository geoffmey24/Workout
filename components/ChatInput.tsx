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

  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
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

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
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
        setIsListening(false);
        // Auto-populate the final transcript
        if (finalTranscript) {
          setText(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
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
            className="rounded-full bg-gray-100 p-1 hover:bg-gray-200"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-gray-100 p-2.5 text-[#6b7280] hover:text-[#111827] hover:bg-gray-200 transition-colors"
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
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-100 text-[#6b7280] hover:text-[#111827] hover:bg-gray-200'
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
          className={`flex-1 resize-none rounded-xl border bg-gray-50 px-4 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${
            isListening ? 'border-red-400 ring-1 ring-red-400' : 'border-[#e5e7eb]'
          }`}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="rounded-lg bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
