import React, { useEffect, useState } from 'react';
import { fetchHealth, healthToEngineStatus, type RealtimeEngineStatus as EngineStatus } from '../../services/api/sanctumApi';
import { cn } from '../../lib/utils';

export function useRealtimeEngineStatus(): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>('not_configured');

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then((health) => {
      if (!cancelled) setStatus(healthToEngineStatus(health));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

export const RealtimeEngineStatus: React.FC<{ className?: string }> = ({ className }) => {
  const status = useRealtimeEngineStatus();
  const configured = status === 'configured';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider',
        configured ? 'text-[#3D6655] dark:text-[#E8D8B2]' : 'text-amber-800 dark:text-amber-300',
        className
      )}
      title={configured ? 'LiveKit is configured on the server' : 'LIVEKIT_URL / API key / secret are not set'}
    >
      <span className="text-[#68736D] dark:text-[#96A39D] font-semibold normal-case tracking-normal">
        Realtime Engine
      </span>
      <span>{configured ? 'Configured' : 'Not configured'}</span>
    </div>
  );
};
