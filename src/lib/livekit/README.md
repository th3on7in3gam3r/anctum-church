# Sanctum Live™ — LiveKit Real-Time Media Engine (Phase 1B Specification)

This directory defines the architectural boundaries and integration contracts for **Phase 1B**, when Sanctum Live connects to LiveKit Cloud / self-hosted LiveKit SFU.

> **CRITICAL SECURITY DIRECTIVE:**
> - `LIVEKIT_API_SECRET` and `LIVEKIT_API_KEY` MUST remain strictly on the server-side (`server/` or Next.js server actions/API routes).
> - Never bundle LiveKit admin credentials into client-side code.
> - The client-side will ONLY receive ephemeral, short-lived JWT tokens minted by the Sanctum authentication and role verification layer.

---

## 1. Environment Configuration for Phase 1B

When ready to connect LiveKit in Phase 1B, populate these environment variables in your server configuration:

```bash
# LiveKit SFU WebSocket endpoint
LIVEKIT_URL="wss://sanctum-live-project.livekit.cloud"

# Server credentials (used exclusively by server-side token generator & RoomServiceClient)
LIVEKIT_API_KEY="APISanctumKeyPlaceholder"
LIVEKIT_API_SECRET="SecretSanctumKeyPlaceholderLongString"
```

---

## 2. Server-Side Token Generation Pattern

In Phase 1B, when a participant joins via `/api/rooms/[slug]/join`, the backend mints a restricted JWT token using `livekit-server-sdk`:

```typescript
import { AccessToken } from 'livekit-server-sdk';

export async function generateParticipantToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  role: 'OWNER' | 'ADMIN' | 'PRAYER_LEADER' | 'SPEAKER' | 'LISTENER';
}) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: params.participantIdentity,
    name: params.participantName,
    ttl: '6h',
  });

  // Role-Based LiveKit Grants:
  if (params.role === 'LISTENER') {
    // 🎧 Listeners are strictly SUBSCRIBER-ONLY.
    // They cannot publish audio, video, or data tracks.
    at.addGrant({
      roomJoin: true,
      room: params.roomName,
      canPublish: false,
      canPublishData: false,
      canSubscribe: true,
    });
  } else if (params.role === 'SPEAKER') {
    // 🎙️ Invited Speakers can publish AUDIO only.
    at.addGrant({
      roomJoin: true,
      room: params.roomName,
      canPublish: true,
      canPublishSources: ['microphone'],
      canPublishData: true,
      canSubscribe: true,
    });
  } else {
    // 👑 Prayer Leaders / Admins / Owners
    at.addGrant({
      roomJoin: true,
      room: params.roomName,
      canPublish: true,
      canPublishSources: ['microphone', 'camera'],
      canPublishData: true,
      canSubscribe: true,
      roomAdmin: true,
    });
  }

  return at.toJwt();
}
```

---

## 3. Dynamic Permission & Mute Operations (RoomServiceClient)

When a Prayer Leader or Admin invites a raised-hand listener or mutes a speaker:

```typescript
import { RoomServiceClient } from 'livekit-server-sdk';

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// Invite listener to speak (grant audio publishing dynamically)
export async function grantSpeakerPermission(roomName: string, participantIdentity: string) {
  await roomService.updateParticipant(roomName, participantIdentity, undefined, {
    canPublish: true,
    canPublishSources: ['microphone'],
  });
}

// Return speaker to listener (revoke publishing permission & mute)
export async function revokeSpeakerPermission(roomName: string, participantIdentity: string) {
  await roomService.updateParticipant(roomName, participantIdentity, undefined, {
    canPublish: false,
  });
}

// Mute participant's active audio track
export async function muteSpeakerTrack(roomName: string, participantIdentity: string, trackSid: string) {
  await roomService.mutePublishedTrack(roomName, participantIdentity, trackSid, true);
}

// Remove or kick disruptive participant
export async function removeParticipant(roomName: string, participantIdentity: string) {
  await roomService.removeParticipant(roomName, participantIdentity);
}
```

---

## 4. Webhook Receiver (`/api/livekit/webhooks`)

Sanctum will listen for server-authoritative LiveKit events to update database session records:
- `participant_joined`: Increment current attendee counter & log participant session
- `participant_left`: Decrement attendee counter & record leave timestamp
- `track_published`: Identify active speaking pastor/leader
- `room_finished`: Finalize duration and peak metrics in `PrayerSession`

---

## 5. Client Integration in Phase 1B

In Phase 1B, replace `developmentRealtimeProvider.ts` with `livekitRealtimeProvider.ts` implementing `RealtimeProvider`:
- Connect via `@livekit/components-react` / `livekit-client`
- Bind `ConnectionStatus` to `useConnectionState()`
- Bind Audio Visualizer to active audio track's `AudioTrack.getVolume()`
- Listen for `ParticipantPermissionsChanged` event to prompt the listener with the `<InvitedSpeakerBanner />`.
