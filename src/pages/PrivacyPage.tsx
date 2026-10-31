import React from 'react';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { leaveToHome } from '../lib/appMode';

interface PrivacyPageProps {
  onNavigate: (path: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F8F7F3] dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] p-4 sm:p-8 flex flex-col justify-between transition-colors">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-[#E5E6E1] dark:border-[#26362F]">
          <button
            onClick={() => leaveToHome(onNavigate)}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:text-[#16251F] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <SanctumLogo size="sm" />
        </div>

        <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-10 border border-[#E5E6E1] dark:border-[#26362F] shadow-sm space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Privacy Policy for Congregations
            </h1>
            <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
              Last updated: August 2026
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] leading-relaxed">
            <p>
              Sanctum Live™ is designed to be a sacred, trustworthy sanctuary for churches and believers worldwide. We respect your spiritual privacy and have architected our platform around minimum data collection principles.
            </p>

            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3] pt-2">
              1. Attendee Privacy & Zero Tracking
            </h3>
            <p>
              Congregation attendees are never required to create accounts, provide passwords, or submit tracking information. Entering a first name or display name is sufficient to join corporate gatherings.
            </p>

            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3] pt-2">
              2. Strict Microphone & Camera Isolation
            </h3>
            <p>
              Attendees enter every prayer gathering as listeners. Your device's microphone and camera are completely disabled and cannot be activated unless you explicitly tap "Accept" on an invitation from a prayer leader.
            </p>

            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3] pt-2">
              3. Confidentiality of Prayer Requests
            </h3>
            <p>
              When an attendee marks a prayer request as "Private to Prayer Leaders," it is visible exclusively to authorized church pastors and intercession leaders in the Prayer Control Room. It is never broadcasted publicly.
            </p>
          </div>
        </div>
      </div>

      <footer className="max-w-3xl mx-auto w-full text-center text-xs text-[#68736D] dark:text-[#96A39D] pt-6">
        © {new Date().getFullYear()} Sanctum Live™. Designed for worship and prayer.
      </footer>
    </div>
  );
};
