import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/apiClient';
import { useAuth } from '../lib/AuthContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatApiResponse {
  response: string;
  session_id: string;
}

const STORAGE_KEY = 'trailpulse_chat_messages';
const SESSION_KEY = 'trailpulse_chat_session_id';

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_KEY);
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Persist session_id to sessionStorage
  useEffect(() => {
    if (sessionId) {
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  }, [sessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiFetch<ChatApiResponse>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
        }),
      });

      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, something went wrong: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <>
      {/* Floating chat trigger — prominent pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 px-6 py-4 group"
          aria-label="Open trail planning chat"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-icons text-2xl">terrain</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-black tracking-tight">Trail AI Agent</div>
            <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Plan your adventure</div>
          </div>
          <span className="relative flex h-3 w-3 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-emerald-600 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="material-icons text-white/90">terrain</span>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight">Trail AI</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Planning Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-white/50 hover:text-white transition-colors"
                title="Clear conversation"
              >
                <span className="material-icons text-[18px]">delete_outline</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
                title="Close chat"
              >
                <span className="material-icons text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <span className="material-icons text-4xl text-slate-200 mb-3 block">hiking</span>
                <p className="text-sm font-bold text-slate-400">Ask me about trails, weather, training plans...</p>
                <div className="mt-4 space-y-2">
                  {[
                    'Plan a trail run near Seattle this weekend',
                    'What gear do I need for a mountain run?',
                    'Build me a training plan for a 50K',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left px-4 py-2.5 text-xs font-semibold text-navy/60 bg-slate-50 rounded-xl hover:bg-primary/5 hover:text-primary transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-slate-50 text-navy border border-slate-100 rounded-bl-md'
                    }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="material-icons text-base animate-spin">sync</span>
                    <span className="font-semibold">Planning your adventure...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-100 p-4 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={user ? 'Ask about trails, weather, plans...' : 'Ask about trails, weather, plans...'}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-navy placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="p-3 bg-primary text-white rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-icons text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
