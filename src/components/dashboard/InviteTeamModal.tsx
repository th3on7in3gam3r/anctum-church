import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types';
import { useApp } from '../../context/AppContext';

interface InviteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteTeamModal: React.FC<InviteTeamModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'PRAYER_LEADER'>('PRAYER_LEADER');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      addToast('Please enter both name and email', 'warning');
      return;
    }

    addToast(`Invitation sent to ${name} (${email}) as ${role === 'ADMIN' ? 'Admin' : 'Prayer Leader'}`, 'success');
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setName('');
      setEmail('');
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-team-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#17221D] rounded-3xl shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="invite-team-title" className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
                Invite Your Prayer Team
              </h2>
              <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
                Co-laborers, admins, and prayer leaders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSent ? (
          <div className="p-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
              Invitation Sent!
            </h3>
            <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
              They will receive instructions to join your prayer control team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pastor Robert, Deaconess Sarah"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3] dark:bg-[#101814] text-xs text-[#16251F] dark:text-[#F8F7F3] focus:outline-none focus:border-[#203C32] dark:focus:border-[#C9A35A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@ministry.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3] dark:bg-[#101814] text-xs text-[#16251F] dark:text-[#F8F7F3] focus:outline-none focus:border-[#203C32] dark:focus:border-[#C9A35A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider mb-1.5">
                Role & Permissions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('PRAYER_LEADER')}
                  className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                    role === 'PRAYER_LEADER'
                      ? 'border-[#203C32] dark:border-[#C9A35A] bg-[#203C32]/5 dark:bg-[#C9A35A]/10 font-bold'
                      : 'border-[#E5E6E1] dark:border-[#26362F]'
                  }`}
                >
                  <p className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Prayer Leader</p>
                  <p className="text-[10px] text-[#68736D] dark:text-[#96A39D] mt-0.5">Can lead and speak</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ADMIN')}
                  className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                    role === 'ADMIN'
                      ? 'border-[#203C32] dark:border-[#C9A35A] bg-[#203C32]/5 dark:bg-[#C9A35A]/10 font-bold'
                      : 'border-[#E5E6E1] dark:border-[#26362F]'
                  }`}
                >
                  <p className="font-bold text-[#16251F] dark:text-[#F8F7F3]">Admin</p>
                  <p className="text-[10px] text-[#68736D] dark:text-[#96A39D] mt-0.5">Full control room access</p>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 cursor-pointer"
              >
                I'll Do This Later
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] cursor-pointer shadow-xs"
              >
                Send Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
