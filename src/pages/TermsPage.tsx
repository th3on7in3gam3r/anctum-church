import React from 'react';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { leaveToHome } from '../lib/appMode';

interface TermsPageProps {
  onNavigate: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
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
            <div className="w-10 h-10 rounded-xl bg-[#203C32]/10 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
              Guidelines for church organizations and prayer gatherings
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] leading-relaxed">
            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
              1. Platform Purpose
            </h3>
            <p>
              Sanctum Live™ is provided to facilitate corporate prayer, Christian fellowship, intercession, and church gatherings.
            </p>

            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
              2. Ministry Organization Responsibilities
            </h3>
            <p>
              Church administrators and prayer leaders are responsible for maintaining order, upholding wholesome pastoral community standards, and moderating spoken intercession during corporate sessions.
            </p>

            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
              3. Service Availability
            </h3>
            <p>
              Sanctum Live is being built to support church prayer gatherings across a range of network conditions. Realtime media reliability depends on the Sanctum media engine, which activates in a later phase.
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
