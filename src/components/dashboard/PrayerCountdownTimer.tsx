import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  ChevronDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatTime } from '../../lib/utils';

interface PrayerCountdownTimerProps {
  initialMinutes?: number;
  activeSpeakerName?: string;
  onTimeExpired?: () => void;
  className?: string;
}

const PRESET_DURATIONS = [
  { label: '2 min', seconds: 120, description: 'Short Exhortation' },
  { label: '3 min', seconds: 180, description: 'Speaker Intercession' },
  { label: '5 min', seconds: 300, description: 'Standard Turn' },
  { label: '10 min', seconds: 600, description: 'Prayer Focus' },
  { label: '15 min', seconds: 900, description: 'Corporate Warfare' },
];

export const PrayerCountdownTimer: React.FC<PrayerCountdownTimerProps> = ({
  initialMinutes = 5,
  activeSpeakerName,
  onTimeExpired,
  className = '',
}) => {
  const [totalDuration, setTotalDuration] = useState<number>(initialMinutes * 60);
  const [timeLeft, setTimeLeft] = useState<number>(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [customLabel, setCustomLabel] = useState<string>('Intercession Turn');
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('5');
  const [hasAlerted, setHasAlerted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Synthesize a soft bell/chime using Web Audio API
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First harmonic chime tone (Soft temple bell / meditation gong)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, ctx.currentTime); // 528 Hz (Love / Restoration tone)
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1056, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 2.0);
      osc2.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.warn('Audio chime notice not supported in this environment', e);
    }
  };

  // Timer interval ticker
  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            if (!hasAlerted) {
              setHasAlerted(true);
              playChime();
              if (onTimeExpired) onTimeExpired();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, hasAlerted, soundEnabled, onTimeExpired]);

  // When active speaker changes, optionally update label
  useEffect(() => {
    if (activeSpeakerName) {
      setCustomLabel(`${activeSpeakerName}'s Turn`);
    }
  }, [activeSpeakerName]);

  const handleStartPause = () => {
    if (timeLeft === 0) {
      // If at 0, reset before starting
      setTimeLeft(totalDuration);
      setHasAlerted(false);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = (newDurationSeconds?: number) => {
    setIsRunning(false);
    const duration = newDurationSeconds !== undefined ? newDurationSeconds : totalDuration;
    setTotalDuration(duration);
    setTimeLeft(duration);
    setHasAlerted(false);
  };

  const handleAddExtraTime = (extraSeconds: number) => {
    setTimeLeft((prev) => prev + extraSeconds);
    setTotalDuration((prev) => prev + extraSeconds);
    setHasAlerted(false);
  };

  const handleSetPreset = (seconds: number, label: string) => {
    setIsRunning(false);
    setTotalDuration(seconds);
    setTimeLeft(seconds);
    setHasAlerted(false);
  };

  const handleApplyCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(120, parseInt(customMinutesInput, 10) || 5));
    handleReset(mins * 60);
    setIsEditingCustom(false);
  };

  // Progress percentage (100% when full, 0% when expired)
  const progressPercent = totalDuration > 0 ? (timeLeft / totalDuration) * 100 : 0;
  const isUrgent = timeLeft <= 60 && timeLeft > 0;
  const isExpired = timeLeft === 0;

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F] shadow-xs relative overflow-hidden transition-all ${
        isExpired
          ? 'border-red-400 dark:border-red-600/60 ring-2 ring-red-500/20'
          : isUrgent
          ? 'border-amber-400 dark:border-amber-500/50 ring-2 ring-amber-500/20'
          : ''
      } ${className}`}
    >
      {/* Background Subtle Progress Track */}
      <div
        className="absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear"
        style={{
          width: `${progressPercent}%`,
          backgroundColor: isExpired ? '#DC2626' : isUrgent ? '#F59E0B' : '#C9A35A',
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E6E1] dark:border-[#26362F]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#203C32]/10 dark:bg-[#C9A35A]/20 text-[#203C32] dark:text-[#C9A35A]">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#16251F] dark:text-[#F8F7F3]">
              Prayer Session Countdown
            </h3>
            {isRunning && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Target: <strong className="text-[#203C32] dark:text-[#E8D8B2]">{customLabel}</strong>
          </p>
        </div>

        {/* Quick Chime Toggle & Sound State */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Chime sound on expiry enabled' : 'Chime sound muted'}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-[#E5E6E1] dark:border-[#26362F] text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5'
                : 'border-transparent bg-gray-100 dark:bg-white/5 text-gray-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'Chime Alert' : 'Silent'}</span>
          </button>
        </div>
      </div>

      {/* Main Countdown Display & Big Digital Readout */}
      <div className="my-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-baseline gap-3">
          <div
            className={`font-mono text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight transition-colors ${
              isExpired
                ? 'text-red-600 dark:text-red-400 animate-bounce'
                : isUrgent
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-[#16251F] dark:text-[#F8F7F3]'
            }`}
          >
            {formatTime(timeLeft)}
          </div>

          <div className="text-xs font-semibold text-[#68736D] dark:text-[#96A39D] flex flex-col">
            <span>of {formatTime(totalDuration)} total</span>
            {isExpired ? (
              <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Turn Completed!
              </span>
            ) : isUrgent ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                Wrap-up Window ({"<"} 1 min)
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                Flow on schedule
              </span>
            )}
          </div>
        </div>

        {/* Primary Controls: Play / Pause, Reset, Quick Add Time */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <button
            type="button"
            onClick={handleStartPause}
            className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-sm flex items-center gap-2 transition-transform active:scale-95 cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : isExpired
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Timer</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{isExpired ? 'Restart Turn' : timeLeft < totalDuration ? 'Resume' : 'Start Timer'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleReset()}
            title="Reset timer to original duration"
            className="p-3 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F] text-[#68736D] dark:text-[#96A39D] hover:text-[#16251F] dark:hover:text-[#F8F7F3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-[#E5E6E1] dark:bg-[#26362F] mx-1 hidden sm:block" />

          {/* Quick Extension Buttons */}
          <button
            type="button"
            onClick={() => handleAddExtraTime(60)}
            className="px-3 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-xs font-semibold text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+1 Min</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddExtraTime(120)}
            className="px-3 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-xs font-semibold text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+2 Min</span>
          </button>
        </div>
      </div>

      {/* Preset Duration Selector Bar */}
      <div className="pt-3 border-t border-[#E5E6E1] dark:border-[#26362F] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D] mr-1">
            Presets:
          </span>
          {PRESET_DURATIONS.map((preset) => {
            const isSelected = totalDuration === preset.seconds && !isEditingCustom;
            return (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => handleSetPreset(preset.seconds, preset.description)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814] font-bold'
                    : 'bg-[#F8F7F3] dark:bg-[#101814] text-[#68736D] dark:text-[#96A39D] hover:text-[#16251F] dark:hover:text-[#F8F7F3] border border-[#E5E6E1] dark:border-[#26362F]'
                }`}
                title={preset.description}
              >
                {preset.label}
              </button>
            );
          })}

          {isEditingCustom ? (
            <form onSubmit={handleApplyCustomMinutes} className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="120"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                placeholder="Mins"
                className="w-16 px-2 py-1 text-xs rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#203C32] dark:border-[#C9A35A] text-[#16251F] dark:text-[#F8F7F3] focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCustom(false)}
                className="px-1 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingCustom(true)}
              className="px-3 py-1 rounded-xl text-xs font-medium bg-[#F8F7F3] dark:bg-[#101814] text-[#68736D] dark:text-[#96A39D] hover:text-[#16251F] dark:hover:text-[#F8F7F3] border border-[#E5E6E1] dark:border-[#26362F] cursor-pointer"
            >
              Custom...
            </button>
          )}
        </div>

        {/* Quick Speaker Tag Editor */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Speaker / Focus:</span>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Sermon or prayer leader"
            className="px-2.5 py-1 text-xs rounded-xl bg-[#F8F7F3]/70 dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] border border-[#E5E6E1] dark:border-[#26362F] focus:border-[#203C32] dark:focus:border-[#C9A35A] focus:outline-none max-w-[160px]"
          />
        </div>
      </div>
    </div>
  );
};
