import { AdminAction, AdminActionType } from '../types';

export class AuditLogger {
  private static STORAGE_KEY = 'sanctum_audit_logs';

  static getLogs(): AdminAction[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static log(
    actionType: AdminActionType,
    details: {
      adminId?: string;
      adminName?: string;
      targetId?: string;
      targetName?: string;
      sessionId?: string;
      roomName?: string;
      note?: string;
      metadata?: Record<string, any>;
    }
  ): AdminAction {
    const newLog: AdminAction = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action: actionType,
      adminId: details.adminId || '',
      adminName: details.adminName || '',
      participantId: details.targetId,
      participantName: details.targetName,
      sessionId: details.sessionId,
      metadata: {
        ...details.metadata,
        roomName: details.roomName,
        note: details.note,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      const current = this.getLogs();
      const updated = [newLog, ...current.slice(0, 99)];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    return newLog;
  }
}
