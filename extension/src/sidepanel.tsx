import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseJoinInput } from '../../src/services/joinLink';
import { getAltar, joinAsGuest, leaveSession, listLiveAltars, type LiveAltar } from './api';
import { prayerAudio, type PrayerAudioStatus } from './prayerAudio';
import { extensionStorage } from './storage';
import './sidepanel.css';

type Listening = {
  slug: string;
  roomName: string;
  sessionId: string;
  participantId: string;
};

function SidePanel() {
  const [origin, setOrigin] = useState('https://sanctum.live');
  const [guestName, setGuestName] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [liveRooms, setLiveRooms] = useState<LiveAltar[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState<Listening | null>(null);
  const [status, setStatus] = useState<PrayerAudioStatus>('idle');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    void (async () => {
      const [savedOrigin, savedName, savedSlug] = await Promise.all([
        extensionStorage.getApiOrigin(),
        extensionStorage.getGuestName(),
        extensionStorage.getLastSlug(),
      ]);
      setOrigin(savedOrigin);
      setGuestName(savedName);
      if (savedSlug) setJoinInput(savedSlug);
      try {
        const result = await listLiveAltars(savedOrigin);
        setLiveRooms(result.rooms || []);
      } catch {
        setLiveRooms([]);
      }
    })();
    return prayerAudio.onStatus(setStatus);
  }, []);

  const join = async (raw: string) => {
    const slug = parseJoinInput(raw);
    const name = guestName.trim();
    if (!name) {
      setError('Enter the name you want the church to see.');
      return;
    }
    if (!slug) {
      setError('Paste the prayer link your pastor sent, or the gathering code.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const altar = await getAltar(origin, slug);
      if (!altar.session?.id) {
        throw new Error('That gathering is not open yet. Stay on this panel and try again when it goes live.');
      }
      const joined = await joinAsGuest(origin, altar.session.id, name);
      if (!joined.token || !joined.livekitUrl) {
        throw new Error('Prayer audio is not available for this gathering yet.');
      }
      await prayerAudio.connect(joined.livekitUrl, joined.token);
      extensionStorage.setLastSlug(slug);
      extensionStorage.setGuestName(name);
      setListening({
        slug,
        roomName: altar.room.name,
        sessionId: altar.session.id,
        participantId: joined.participant.id,
      });
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join that gathering.');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!listening) return;
    setBusy(true);
    try {
      await leaveSession(origin, listening.sessionId, listening.participantId);
    } catch {
      /* still drop local audio */
    }
    await prayerAudio.disconnect();
    setListening(null);
    setMuted(false);
    setBusy(false);
  };

  const toggleMute = () => {
    const next = !muted;
    prayerAudio.setMuted(next);
    setMuted(next);
  };

  return (
    <div className="panel">
      <div className="brand">
        <div className="mark" aria-hidden="true">
          <div className="bar" style={{ height: 8 }} />
          <div className="bar" style={{ height: 14 }} />
          <div className="bar" style={{ height: 10, background: 'var(--green)' }} />
          <div className="bar" style={{ height: 8 }} />
        </div>
        <div className="wordmark">
          Sanctum<span>Live</span>
        </div>
      </div>

      {listening ? (
        <section className="listening">
          <span className="badge">
            <span className="dot" />
            LIVE
          </span>
          <div className="room-name">{listening.roomName}</div>
          <div className="status">
            {status === 'connected'
              ? muted
                ? 'Audio muted — prayer is still connected'
                : 'Listening while you browse'
              : status === 'reconnecting'
                ? 'Reconnecting to prayer…'
                : status === 'connecting'
                  ? 'Connecting…'
                  : 'Disconnected'}
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={toggleMute}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void leave()} disabled={busy}>
              Leave
            </button>
          </div>
        </section>
      ) : (
        <>
          <div>
            <p className="kicker">Stay in prayer</p>
            <h1>Listen while you browse</h1>
            <p className="lede">
              Join as a listener. Keep this side panel open and prayer audio continues in other tabs.
            </p>
          </div>

          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              void join(joinInput);
            }}
          >
            <div>
              <label htmlFor="guest-name">Your name</label>
              <input
                id="guest-name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="e.g. Sarah"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="join-link">Prayer link or code</label>
              <input
                id="join-link"
                value={joinInput}
                onChange={(event) => setJoinInput(event.target.value)}
                placeholder="sanctum.live/join/morning-prayer"
              />
            </div>
            {error ? <div className="error">{error}</div> : null}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Joining…' : 'Join prayer'}
            </button>
          </form>

          <div className="stack">
            <p className="kicker">Live now</p>
            {liveRooms.length === 0 ? (
              <p className="empty">No live gatherings on this server right now.</p>
            ) : (
              <div className="live-list">
                {liveRooms.map((room) => (
                  <button
                    key={room.sessionId}
                    type="button"
                    className="live-item"
                    onClick={() => {
                      setJoinInput(room.slug);
                      void join(room.slug);
                    }}
                  >
                    <strong>{room.name}</strong>
                    <span>{room.organizationName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <footer className="footer">
        <details>
          <summary>Server</summary>
          <div className="stack">
            <input
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              onBlur={() => extensionStorage.setApiOrigin(origin)}
              aria-label="API origin"
            />
            <p>Default is production. Use http://localhost:3000 when testing locally.</p>
          </div>
        </details>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <SidePanel />
    </React.StrictMode>
  );
}
