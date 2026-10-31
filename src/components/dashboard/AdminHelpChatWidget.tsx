import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sanctumApi, ApiClientError } from '../../services/api/sanctumApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AdminHelpChatWidgetProps {
  currentPath: string;
}

const STARTER_PROMPTS = [
  'How do I create a prayer room?',
  'How does holding to speak work?',
  'How do I invite an Admin?',
  'Congregants cannot hear me — what do I check?',
];

export const AdminHelpChatWidget: React.FC<AdminHelpChatWidgetProps> = ({ currentPath }) => {
  const { user, organization } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I am your Sanctum Live guide. Ask me how to create rooms, run the Control Room, manage Admins, or fix common issues.',
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canUseHelp = user?.role === 'OWNER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  if (!canUseHelp) return null;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMessage]
        .filter((item) => item.id !== 'welcome')
        .map((item) => ({ role: item.role, content: item.content }));

      const { reply } = await sanctumApi.helpChat(
        {
          message: trimmed,
          pageContext: currentPath,
          history,
        },
        { userId: user?.id, organizationId: organization.id }
      );

      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: reply },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiClientError && error.code === 'HELP_ASSISTANT_UNAVAILABLE'
          ? 'Help assistant is not configured yet. Add GEMINI_API_KEY on the server to enable it.'
          : error instanceof ApiClientError
            ? error.message
            : 'Sorry, I could not answer right now. Try again in a moment.';
      setMessages((prev) => [
        ...prev,
        { id: `assistant-error-${Date.now()}`, role: 'assistant', content: message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[min(100vw-2rem,24rem)] h-[min(70vh,32rem)] bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3] dark:bg-[#101814]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#203C32] dark:bg-[#C9A35A] text-white dark:text-[#101814] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#16251F] dark:text-[#F8F7F3] truncate">Sanctum Help</p>
                <p className="text-[10px] text-[#68736D] dark:text-[#96A39D] truncate">Ask how to use Sanctum Live</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help chat"
              className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]'
                      : 'bg-[#F8F7F3] dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] border border-[#E5E6E1] dark:border-[#26362F]'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-xs text-[#68736D] dark:text-[#96A39D] animate-pulse">Thinking…</p>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full border border-[#E5E6E1] dark:border-[#26362F] text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
            className="p-3 border-t border-[#E5E6E1] dark:border-[#26362F] flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask how to do something…"
              rows={2}
              maxLength={2000}
              className="flex-1 resize-none px-3 py-2 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#101814] text-sm text-[#16251F] dark:text-[#F8F7F3] outline-none focus:ring-2 focus:ring-[#C9A35A]/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send help message"
              className="p-2.5 rounded-xl bg-[#203C32] dark:bg-[#C9A35A] text-white dark:text-[#101814] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close Sanctum Help' : 'Open Sanctum Help'}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-[#203C32] dark:bg-[#C9A35A] text-white dark:text-[#101814] shadow-lg flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>
    </>
  );
};
