'use client';

import { useState, useRef } from 'react';
import { Send, Image, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, image?: string, imageType?: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

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
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-xl border border-[#e5e7eb] bg-[#f0f1f3] px-4 py-2.5 text-sm text-[#111827] placeholder-[#4b5563] focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
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
