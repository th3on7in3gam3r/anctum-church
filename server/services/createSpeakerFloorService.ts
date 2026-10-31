import { auditRepository, participantRepository, sessionRepository, speakerInvitationRepository } from '../repositories/index.ts';
import { getLiveKitProvider } from '../realtime/livekitProvider.ts';
import { SpeakerFloorService, type SpeakerFloorStore } from './speakerFloorService.ts';

const prismaStore: SpeakerFloorStore = {
  getSession: (sessionId) => sessionRepository.findById(sessionId),
  getParticipant: (participantId) => participantRepository.findById(participantId),
  setActiveSpeaker: async (sessionId, participantId) => {
    await sessionRepository.update(sessionId, { activeSpeakerParticipantId: participantId });
  },
  setParticipantRole: async (participantId, role) => {
    await participantRepository.updateRole(participantId, role);
  },
  createInvitation: (input) => speakerInvitationRepository.create(input),
  writeAudit: async (input) => {
    await auditRepository.write(input);
  },
};

export function createSpeakerFloorService(): SpeakerFloorService {
  return new SpeakerFloorService(prismaStore, getLiveKitProvider());
}
