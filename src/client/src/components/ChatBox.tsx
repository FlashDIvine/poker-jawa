import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@shared/types.js';
import { MessageSquare, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

const QUICK_EMOTES = [
  'Banting! 💥',
  'Poker! 🔥',
  'Bong! 💣',
  'Ampun suhu! 🙏',
  'Ayo jalan! ⏱️',
  'GG! 👑'
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggleOpen
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleEmoteClick = (emote: string) => {
    onSendMessage(emote);
  };

  return (
    <div className="fixed bottom-3 right-3 z-40 w-72 sm:w-80 flex flex-col items-end">
      {/* Header bar / Toggle */}
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-xl text-slate-200 text-xs font-semibold backdrop-blur-md cursor-pointer transition-all mb-2"
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
        <span>Obrolan ({messages.length})</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-full bg-slate-950/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md animate-fadeIn max-h-96">
          {/* Quick Emotes Bar */}
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto border-b border-slate-800 bg-slate-900/60 scrollbar-none">
            {QUICK_EMOTES.map((emote) => (
              <button
                key={emote}
                onClick={() => handleEmoteClick(emote)}
                className="whitespace-nowrap px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
              >
                {emote}
              </button>
            ))}
          </div>

          {/* Messages List */}
          <div className="p-3 overflow-y-auto space-y-2 h-52 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-6 text-[11px]">
                Belum ada pesan. Kirim obrolan atau gunakan stiker!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.isSystem ? 'items-center my-1' : 'items-start'
                  }`}
                >
                  {msg.isSystem ? (
                    <div className="bg-slate-900/80 text-amber-300/90 px-2.5 py-1 rounded-full text-[10px] text-center border border-amber-500/20 max-w-full">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-2.5 py-1.5 max-w-[90%]">
                      <span className="font-bold text-amber-400 text-[10px] block">
                        {msg.senderName}
                      </span>
                      <span className="text-slate-100 break-words">{msg.text}</span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-2 border-t border-slate-800 flex items-center gap-1.5 bg-slate-900/80"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan..."
              maxLength={100}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
