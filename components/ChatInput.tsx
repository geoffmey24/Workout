'use client';

import { useState, useRef } from 'react';
import MaterialIcon from './MaterialIcon';

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
    <div className="bg-slate-50/80 backdrop-blur-md border-t border-outline-variant/10 p-3">
      {image && (
        <div className="mb-2 flex items-center gap-2">
          <img
            src={`data:${imageType};base64,${image}`}
            alt="Preview"
            className="h-16 w-16 rounded-xl object-cover"
          />
          <button
            onClick={() => { setImage(null); setImageType(''); }}
            className="rounded-xl bg-surface-container-low p-1 hover:bg-surface-container-high"
          >
            <MaterialIcon icon="close" size={14} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-surface-container-low p-2.5 text-secondary hover:text-on-surface hover:bg-surface-container-high transition-colors"
          disabled={disabled}
        >
          <MaterialIcon icon="image" size={20} />
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
          className="flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !image)}
          className="rounded-xl bg-primary p-2.5 text-white transition-colors hover:bg-primary-container disabled:opacity-40"
        >
          <MaterialIcon icon="send" size={20} />
        </button>
      </div>
    </div>
  );
}
