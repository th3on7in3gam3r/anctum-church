import React, { useState, useEffect } from 'react';
import {
  X,
  Mic,
  Volume2,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Radio,
  Sliders,
  Layers,
  Lock,
} from 'lucide-react';
import { DeviceTestService } from '../../services/deviceTestService';
import { ReadinessCheckStatus } from '../../types';
import { BackButton } from '../common/BackButton';

interface TestPrayerRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName?: string;
  backLabel?: string;
}

export const TestPrayerRoomModal: React.FC<TestPrayerRoomModalProps> = ({
  isOpen,
  onClose,
  roomName = 'Morning Prayer',
  backLabel = 'Back to Prayer Room',
}) => {
  // Mic state
  const [micStatus, setMicStatus] = useState<ReadinessCheckStatus>('NOT_TESTED');
  const [micLabel, setMicLabel] = useState<string>('Not tested');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Speaker state
  const [speakerStatus, setSpeakerStatus] = useState<ReadinessCheckStatus>('NOT_TESTED');
  const [isPlayingTone, setIsPlayingTone] = useState(false);

  // Network state
  const [networkStatus, setNetworkStatus] = useState<ReadinessCheckStatus>('NOT_TESTED');
  const [networkLatency, setNetworkLatency] = useState<number>(0);
  const [networkLabel, setNetworkLabel] = useState<string>('Not tested');
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto run basic network check
      runNetworkCheck();
    } else {
      // Stop local mic stream if open
      DeviceTestService.stopLocalMicrophone();
      setIsTestingMic(false);
    }
  }, [isOpen]);

  const handleTestMic = async () => {
    setIsTestingMic(true);
    const res = await DeviceTestService.testMicrophone((lvl) => {
      setMicLevel(lvl);
    });
    setMicStatus(res.status);
    setMicLabel(res.label);
  };

  const handlePlayTone = async () => {
    setIsPlayingTone(true);
    const played = await DeviceTestService.playTestTone();
    setIsPlayingTone(false);
    if (played) {
      setSpeakerStatus('READY');
    } else {
      setSpeakerStatus('WARNING');
    }
  };

  const runNetworkCheck = async () => {
    setIsCheckingNetwork(true);
    const res = await DeviceTestService.checkBasicNetwork();
    setNetworkStatus(res.status);
    setNetworkLatency(res.latencyMs);
    setNetworkLabel(res.label);
    setIsCheckingNetwork(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-room-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#17221D] rounded-3xl shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#E5E6E1] dark:border-[#26362F] space-y-3">
          <BackButton label={backLabel} mobileLabel="Back" onClick={onClose} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="test-room-title" className="text-lg font-bold text-[#16251F] dark:text-[#F8F7F3]">
                    Test Prayer Room
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Private Technical Test
                  </span>
                </div>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
                  {roomName} • Isolated environment with zero member notifications
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Test Room"
              className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational banner */}
        <div className="px-6 py-3 bg-[#F8F7F3] dark:bg-[#101814] border-b border-[#E5E6E1] dark:border-[#26362F] flex items-center gap-2 text-xs text-[#68736D] dark:text-[#96A39D]">
          <ShieldCheck className="w-4 h-4 text-[#C9A35A] shrink-0" />
          <span>
            This private test does <strong>not</strong> make the room live, does not notify congregants, and produces no analytics records.
          </span>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 1. Microphone Test */}
          <div className="p-4 rounded-2xl bg-[#F8F7F3]/70 dark:bg-[#101814]/70 border border-[#E5E6E1] dark:border-[#26362F] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider">
                    Microphone Input
                  </h4>
                  <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                    {micStatus === 'READY' ? micLabel : 'Verify local audio input levels'}
                  </p>
                </div>
              </div>

              {micStatus === 'READY' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleTestMic}
                  disabled={isTestingMic}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] cursor-pointer shadow-xs transition-transform active:scale-95"
                >
                  {isTestingMic ? 'Testing...' : 'Test Mic'}
                </button>
              )}
            </div>

            {/* Audio level meter */}
            {isTestingMic && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] text-[#68736D] dark:text-[#96A39D] font-mono">
                  <span>Speak into your mic:</span>
                  <span>{micLevel}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                    style={{ width: `${Math.max(micLevel, 4)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Speaker Output Test */}
          <div className="p-4 rounded-2xl bg-[#F8F7F3]/70 dark:bg-[#101814]/70 border border-[#E5E6E1] dark:border-[#26362F] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider">
                    Speaker / Audio Output
                  </h4>
                  <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                    Play a gentle test chime through your speakers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayTone}
                  disabled={isPlayingTone}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs border border-[#203C32] dark:border-[#C9A35A] text-[#203C32] dark:text-[#E8D8B2] hover:bg-[#203C32]/5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isPlayingTone ? 'Playing...' : 'Play Chime'}</span>
                </button>

                {speakerStatus === 'READY' && (
                  <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Basic Network Check */}
          <div className="p-4 rounded-2xl bg-[#F8F7F3]/70 dark:bg-[#101814]/70 border border-[#E5E6E1] dark:border-[#26362F] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider">
                      Basic Network Check
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
                    {networkLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={runNetworkCheck}
                disabled={isCheckingNetwork}
                className="px-3 py-1 rounded-xl text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                {isCheckingNetwork ? 'Pinging...' : 'Re-check'}
              </button>
            </div>
          </div>

          {/* 4. LiveKit Transport Engine Status */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Media Transport Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                Phase 1B Required
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
              LiveKit audio server connection will be attached in Phase 1B. Current Phase 1A.1 product state machine is verified and ready.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-[#F8F7F3] dark:bg-[#101814] border-t border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-4">
          <span className="text-xs text-[#68736D] dark:text-[#96A39D]">
            All local tests completed safely
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] cursor-pointer shadow-xs"
          >
            Done Testing
          </button>
        </div>
      </div>
    </div>
  );
};
