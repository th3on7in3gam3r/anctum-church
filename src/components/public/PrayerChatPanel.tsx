import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { livekitRealtimeProvider } from '../../services/realtime/livekitRealtimeProvider';
import { loadJoinSession } from '../../services/realtime/joinSessionStore';
import { sanctumApi } from '../../services/api/sanctumApi';
import { useApp } from '../../context/AppContext';

export interface ChatMessage {
  id: string;
  displayName: string;
  body: string;
  timestamp: string;
}

interface PrayerChatPanelProps {
  sessionId?: string;
  senderName: string;
  compact?: boolean;
}

function appendMessage(prev: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (prev.some((item) => item.id === incoming.id)) return prev;
  if (
    prev.some(
      (item) =>
        item.timestamp === incoming.timestamp &&
        item.body === incoming.body &&
        item.displayName === incoming.displayName
    )
  ) {
    return prev;
  }
  return [...prev.slice(-99), incoming];
}

function mapRow(row: {
  id: string;
  displayName: string;
  body: string;
  createdAt?: string;
  timestamp?: string;
}): ChatMessage {
  return {
    id: row.id,
    displayName: row.displayName || 'Attendee',
    body: row.body,
    timestamp: row.timestamp || row.createdAt || new Date().toISOString(),
  };
}

export const PrayerChatPanel: React.FC<PrayerChatPanelProps> = ({
  sessionId,
  senderName,
  compact = false,
}) => {
  const { addToast, localParticipantId } = useApp();
  const [open, setOpen] = useState(!compact);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const resolvedSessionId = sessionId || loadJoinSession()?.sessionId || '';

  useEffect(() => {
    if (!resolvedSessionId) return;
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await sanctumApi.getSession(resolvedSessionId);
        if (cancelled) return;
        const history = (snapshot.chatMessages || []).map(mapRow);
        setMessages(history);
      } catch {
        /* Snapshot is best-effort; live events still apply. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedSessionId]);

  useEffect(() => {
    return livekitRealtimeProvider.subscribe((event) => {
      if (event.type !== 'CHAT_MESSAGE') return;
      const body = typeof event.metadata?.body === 'string' ? event.metadata.body.trim() : '';
      if (!body) return;
      const messageId =
        typeof event.metadata?.messageId === 'string'
          ? event.metadata.messageId
          : `${event.timestamp}-${event.displayName}-${body}`;
      setMessages((prev) =>
        appendMessage(prev, {
          id: messageId,
          displayName: event.displayName || 'Attendee',
          body,
          timestamp: event.timestamp,
        })
      );
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim().slice(0, 240);
    if (!body || sending) return;
    if (!resolvedSessionId) {
      addToast('Join the gathering before sending chat.', 'warning');
      return;
    }
    setSending(true);
    try {
      const participantId = localParticipantId || loadJoinSession()?.participantId;
      const result = await sanctumApi.sendChat(resolvedSessionId, {
        displayName: senderName.trim() || 'Attendee',
        body,
        participantId: participantId || undefined,
      });
      setMessages((prev) => appendMessage(prev, result.message));
      setDraft('');
    } catch {
      addToast('Chat could not send. Stay connected to the gathering and try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sanctum-surface overflow-hidden rounded-[26px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-xs font-bold"
      >
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          Gathering chat
        </span>
        <span className="sanctum-muted text-[10px]">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
          <div
            ref={listRef}
            className={`${compact ? 'max-h-40' : 'max-h-56'} space-y-1.5 overflow-y-auto text-xs`}
          >
            {messages.length === 0 && (
              <p className="sanctum-muted">No messages yet. Keep the altar chat brief.</p>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                <span className="font-bold">{message.displayName}: </span>
                <span>{message.body}</span>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => void send(e)} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={240}
              placeholder={resolvedSessionId ? 'Share a short prayer note…' : 'Join the gathering to chat'}
              disabled={!resolvedSessionId || sending}
              className="sanctum-input flex-1 rounded-xl px-3 py-2 text-xs disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!resolvedSessionId || sending || !draft.trim()}
              className="sanctum-accent cursor-pointer rounded-xl p-2 disabled:cursor-not-allowed"
              aria-label="Send chat"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
