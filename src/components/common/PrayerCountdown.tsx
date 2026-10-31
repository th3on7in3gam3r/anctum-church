import React, { useState, useEffect } from 'react';

interface PrayerCountdownProps {
  targetDate?: Date | string;
  onComplete?: () => void;
  className?: string;
}

export const PrayerCountdown: React.FC<PrayerCountdownProps> = ({
  targetDate,
  onComplete,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const targetTime = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (onComplete) onComplete();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (timeLeft.isPast) {
    return (
      <span className={`font-mono font-bold text-amber-600 dark:text-amber-400 ${className}`}>
        Starting any moment
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <div className="flex flex-col items-center">
        <span className="text-xl sm:text-2xl font-black">{pad(timeLeft.hours)}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70">hrs</span>
      </div>
      <span className="text-xl sm:text-2xl font-black pb-3">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl sm:text-2xl font-black">{pad(timeLeft.minutes)}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70">min</span>
      </div>
      <span className="text-xl sm:text-2xl font-black pb-3">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl sm:text-2xl font-black">{pad(timeLeft.seconds)}</span>
        <span className="text-[9px] uppercase tracking-wider opacity-70">sec</span>
      </div>
    </div>
  );
};
