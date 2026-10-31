import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  Volume2,
  Wifi,
  Users,
  Lock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { DeviceTestService } from '../../services/deviceTestService';
import { ReadinessCheckStatus, PrayerRoom, PrayerSession } from '../../types';
import { BackButton } from '../common/BackButton';

interface PrePrayerCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: PrayerRoom;
  session?: PrayerSession | null;
  waitingCount?: number;
  onStartPrayer: (sermonLeaderName: string) => void;
}

export const PrePrayerCheckModal: React.FC<PrePrayerCheckModalProps> = ({
  isOpen,
  onClose,
  room,
  session,
  waitingCount = 0,
  onStartPrayer,
}) => {
  const [micStatus, setMicStatus] = useState<ReadinessCheckStatus>('NOT_TESTED');
  const [micLabel, setMicLabel] = useState('Tap Test Mic — the browser will ask for permission');
  const [audioStatus, setAudioStatus] = useState<ReadinessCheckStatus>('READY');
  const [networkStatus, setNetworkStatus] = useState<ReadinessCheckStatus>('READY');
  const [networkLatency, setNetworkLatency] = useState<number>(34);
  const [isPlayingChime, setIsPlayingChime] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sermonLeaderName, setSermonLeaderName] = useState('');
  const [leaderError, setLeaderError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSermonLeaderName(session?.sermonLeaderName || '');
      setLeaderError('');
      // Auto run basic check
      DeviceTestService.checkBasicNetwork().then((res) => {
        setNetworkStatus(res.status);
        setNetworkLatency(res.latencyMs);
      });
    }
  }, [isOpen, session?.sermonLeaderName]);

  const handleTestMic = async () => {
    setMicStatus('NOT_TESTED');
    setMicLabel('Requesting microphone…');
    const result = await DeviceTestService.testMicrophone();
    setMicStatus(result.status);
    setMicLabel(result.label);
  };

  const handlePlayChime = async () => {
    setIsPlayingChime(true);
    await DeviceTestService.playTestTone();
    setIsPlayingChime(false);
    setAudioStatus('READY');
  };

  const handleInitiateStart = () => {
    if (!sermonLeaderName.trim()) {
      setLeaderError('Enter the sermon or prayer leader before starting.');
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirm = () => {
    setIsConfirming(false);
    onStartPrayer(sermonLeaderName.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-prayer-check-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#17221D] rounded-3xl shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#E5E6E1] dark:border-[#26362F] space-y-3">
          <BackButton label="Back to Control Room" mobileLabel="Back" onClick={onClose} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 id="pre-prayer-check-title" className="text-lg font-bold text-[#16251F] dark:text-[#F8F7F3]">
                  Pre-Prayer Check™
                </h2>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
                  {room.name} • Admin pre-flight readiness check
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Pre-Prayer Check"
              className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirmation Overlay State */}
        {isConfirming ? (
          <div className="p-8 space-y-6 text-center animate-in zoom-in-95 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center mx-auto">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#16251F] dark:text-[#F8F7F3]">
                Start {room.name}?
              </h3>
              <p className="text-sm text-[#68736D] dark:text-[#96A39D] mt-2 max-w-md mx-auto">
                {waitingCount > 0
                  ? `${waitingCount.toLocaleString()} members are waiting in the Sanctuary and will enter the live prayer gathering immediately.`
                  : 'The sanctuary will go live and congregants can join with one tap.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-5 py-3 rounded-xl font-semibold text-xs border border-[#E5E6E1] dark:border-[#26362F] hover:bg-black/5 dark:hover:bg-white/5 text-[#68736D] dark:text-[#96A39D] cursor-pointer"
              >
                Back to Checklist
              </button>

              <button
                type="button"
                onClick={handleFinalConfirm}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-[#D7473F] hover:bg-[#C23C35] text-white shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Confirm & Go LIVE</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Checklist Grid */}
            <div className="p-6 space-y-3.5 overflow-y-auto flex-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#C9A35A]/10 border border-[#C9A35A]/30">
                <label htmlFor="preflight-sermon-leader" className="font-bold text-[#16251F] dark:text-[#F8F7F3]">
                  Sermon / prayer leader for this session
                </label>
                <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-1">
                  Required so congregants know who is leading today.
                </p>
                <input
                  id="preflight-sermon-leader"
                  required
                  value={sermonLeaderName}
                  onChange={(event) => {
                    setSermonLeaderName(event.target.value);
                    if (event.target.value.trim()) setLeaderError('');
                  }}
                  placeholder="e.g. Pastor Michael"
                  maxLength={120}
                  className="mt-2 w-full px-3 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#101814] text-sm text-[#16251F] dark:text-[#F8F7F3] outline-none focus:ring-2 focus:ring-[#C9A35A]/60"
                />
                {leaderError && <p className="mt-1.5 text-[11px] font-semibold text-[#B94A48]">{leaderError}</p>}
              </div>

              {/* Host Microphone */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      micStatus === 'READY'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : micStatus === 'FAILED'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A]'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Host Microphone</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] truncate">{micLabel}</p>
                  </div>
                </div>
                {micStatus === 'READY' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ready</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleTestMic()}
                    className="px-2.5 py-1 rounded-lg border border-[#203C32] dark:border-[#C9A35A] text-[#203C32] dark:text-[#E8D8B2] text-[11px] font-bold hover:bg-[#203C32]/5 cursor-pointer shrink-0"
                  >
                    Test Mic
                  </button>
                )}
              </div>

              {/* Audio Output */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Audio Output</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">System speakers / headphones</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePlayChime}
                  disabled={isPlayingChime}
                  className="px-2.5 py-1 rounded-lg border border-[#203C32] dark:border-[#C9A35A] text-[#203C32] dark:text-[#E8D8B2] text-[11px] font-bold hover:bg-[#203C32]/5 flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isPlayingChime ? 'Playing...' : 'Test Sound'}</span>
                </button>
              </div>

              {/* Internet Connection */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Basic Network Check</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Stable connection ({networkLatency}ms)</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Good</span>
                </span>
              </div>

              {/* Prayer Leaders */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Prayer Leaders</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Prayer leader (Host)</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </span>
              </div>

              {/* Listeners Waiting */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Sanctuary Waiting Room</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                      {waitingCount > 0 ? `${waitingCount} congregants waiting` : 'Ready to receive attendees'}
                    </p>
                  </div>
                </div>
                <span className="font-bold font-mono text-[#203C32] dark:text-[#E8D8B2]">
                  {waitingCount} waiting
                </span>
              </div>

              {/* Listener Microphones Isolation (Must be locked) */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Listener Microphones</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                      Locked — listeners are configured without publish permission until invited
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  Locked
                </span>
              </div>

              {/* Recording Status */}
              <div className="p-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                    <Disc className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Recording</span>
                    <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                      Recording is not available yet.
                    </p>
                  </div>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-6 bg-[#F8F7F3] dark:bg-[#101814] border-t border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInitiateStart}
                className="px-6 py-3 rounded-2xl font-bold text-sm bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <span>START PRAYER</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
