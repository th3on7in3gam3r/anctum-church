import { AdminAction, AdminActionType } from '../types';

export class AuditLogger {
  private static logs: AdminAction[] = [];

  static log(
    action: AdminActionType,
    params: {
      sessionId?: string;
      adminId: string;
      adminName: string;
      participantId?: string;
      participantName?: string;
      metadata?: Record<string, any>;
    }
  ): AdminAction {
    const record: AdminAction = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: params.sessionId,
      adminId: params.adminId,
      adminName: params.adminName,
      participantId: params.participantId,
      participantName: params.participantName,
      action,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    this.logs.unshift(record);
    // In dev prototype, save to session storage or in-memory
    try {
      const stored = sessionStorage.getItem('sanctum_audit_logs');
      const allLogs = stored ? JSON.parse(stored) : [];
      allLogs.unshift(record);
      sessionStorage.setItem('sanctum_audit_logs', JSON.stringify(allLogs.slice(0, 100)));
    } catch {
      // Ignore storage errors in sandbox
    }

    return record;
  }

  static getLogs(): AdminAction[] {
    try {
      const stored = sessionStorage.getItem('sanctum_audit_logs');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return this.logs;
  }
}
