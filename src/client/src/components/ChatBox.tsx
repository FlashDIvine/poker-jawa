import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@shared/types.js';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  showFloatingTrigger?: boolean;
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
  onToggleOpen,
  showFloatingTrigger = false
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
    <>
      {/* Optional Standalone Desktop Floating Trigger (0 mobile overlap) */}
      {showFloatingTrigger && !isOpen && (
        <div className="fixed bottom-4 right-4 z-40 hidden sm:flex pointer-events-auto">
          <button
            onClick={onToggleOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-xl text-slate-200 text-xs font-semibold backdrop-blur-md cursor-pointer transition-all active:scale-95"
            title="Obrolan Meja"
          >
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Obrolan ({messages.length})</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 leading-none">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Expanded Chat Drawer / Sheet Overlay (With Backdrop Dismissal) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end items-end sm:items-center landscape:items-stretch landscape:justify-end p-0 sm:p-4 animate-fadeIn pointer-events-auto"
          onClick={onToggleOpen}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-80 max-h-[85vh] h-[75vh] sm:h-auto sm:max-h-[85vh] landscape:w-80 landscape:max-h-[70vh] bg-slate-950/98 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl landscape:rounded-l-2xl landscape:rounded-r-none shadow-2xl flex flex-col overflow-hidden backdrop-blur-md animate-slide-up sm:animate-slide-in-right landscape:animate-slide-in-right"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Obrolan Meja ({messages.length})</span>
              </div>
              <button
                onClick={onToggleOpen}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Tutup Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Emotes Bar */}
            <div className="flex items-center gap-1.5 p-2 overflow-x-auto border-b border-slate-800 bg-slate-900/60 scrollbar-none shrink-0">
              {QUICK_EMOTES.map((emote) => (
                <button
                  key={emote}
                  onClick={() => handleEmoteClick(emote)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
                >
                  {emote}
                </button>
              ))}
            </div>

            {/* Messages List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs landscape:h-32">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6 text-[11px]">
                  <span className="text-xl">💬</span>
                  <span className="mt-1">Belum ada pesan. Kirim obrolan atau gunakan stiker!</span>
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
              className="p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] border-t border-slate-800 flex items-center gap-2 bg-slate-900/80 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik pesan..."
                maxLength={100}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-base sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 cursor-pointer transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
