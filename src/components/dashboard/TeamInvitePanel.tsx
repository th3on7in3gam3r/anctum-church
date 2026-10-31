import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ApiClientError, sanctumApi } from '../../services/api/sanctumApi';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  PRAYER_LEADER: 'Prayer Leader',
  TECHNICAL_ADMIN: 'Technical Admin',
  MEDIA: 'Media',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
};

const PAGE_SIZE = 25;

type TeamMember = { userId: string; name: string; email: string; role: string; status: string; canPublishGallery?: boolean };

export const TeamInvitePanel: React.FC = () => {
  const { user, organization } = useAuth();
  const { addToast, confirmAction } = useApp();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEDIA'>('MEDIA');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const actor = { userId: user?.id, organizationId: organization.id };

  const loadMembers = useCallback(async () => {
    try {
      const result = await sanctumApi.listTeam({ userId: user?.id, organizationId: organization.id });
      setMembers(result.members);
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not load the church team.', 'error');
    } finally {
      setLoading(false);
    }
  }, [organization.id, user?.id, addToast]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageMembers = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return members.slice(start, start + PAGE_SIZE);
  }, [members, safePage]);

  const rangeLabel = useMemo(() => {
    if (members.length === 0) return '0 of 0';
    const start = safePage * PAGE_SIZE + 1;
    const end = Math.min(members.length, (safePage + 1) * PAGE_SIZE);
    return `${start}–${end} of ${members.length}`;
  }, [members.length, safePage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@') && !phone.trim()) {
      addToast('Enter a valid staff email.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await sanctumApi.inviteTeamMember({ email: trimmed, phone: phone.trim(), role: inviteRole }, actor);
      setEmail('');
      addToast(
        result.clerkInviteSent
          ? `Invite sent to ${result.member.email}. They can Sign in with that email.`
          : `${result.member.email} is invited. Ask them to Sign in with that email.`,
        'success'
      );
      await loadMembers();
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not invite that staff member.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (member: TeamMember) => {
    if (member.role === 'OWNER') return;
    confirmAction({
      title: `Remove ${member.name}?`,
      description: `${member.email} will lose access to this Sanctum Space dashboard. They can be invited again later.`,
      confirmText: 'Remove',
      cancelText: 'Keep on team',
      isDestructive: true,
      onConfirm: () => {
        void (async () => {
          setRemovingUserId(member.userId);
          try {
            await sanctumApi.removeTeamMember(member.userId, actor);
            addToast(`${member.name} was removed from the team.`, 'success');
            await loadMembers();
          } catch (error) {
            addToast(
              error instanceof ApiClientError ? error.message : 'Could not remove that team member.',
              'error'
            );
          } finally {
            setRemovingUserId(null);
          }
        })();
      },
    });
  };

  return (
    <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-6">
      <div>
        <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">Sanctum Space team</h3>
        <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-1 leading-relaxed">
          Only you, the Owner, can invite Admins. Admins can invite people to speak, mute, unmute, and remove listeners
          in a live prayer room. Congregation never signs in.
        </p>
      </div>

      <form onSubmit={handleInvite} className="space-y-3">
        <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3]">
          Invite an Admin or Media teammate
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value === 'ADMIN' ? 'ADMIN' : 'MEDIA')} className="px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold">
            <option value="MEDIA">Media</option>
            <option value="ADMIN">Admin</option>
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@yourchurch.org"
            className="flex-1 px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="or phone"
            className="flex-1 px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-3 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Inviting…' : 'Invite'}</span>
          </button>
        </div>
        <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">
          Tell them to Sign in with this email. They skip onboarding and enter this Sanctum Space.
        </p>
      </form>

      <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-2">
        {loading ? (
          <p className="text-xs text-[#68736D] dark:text-[#96A39D]">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="text-xs text-[#68736D] dark:text-[#96A39D]">No team members yet.</p>
        ) : (
          <>
            {pageMembers.map((member) => (
              <div
                key={member.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]"
              >
                <div>
                  <p className="text-sm font-semibold text-[#16251F] dark:text-[#F8F7F3]">{member.name}</p>
                  <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {member.email}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide">
                  <span className="text-[#203C32] dark:text-[#C9A35A]">{ROLE_LABELS[member.role] || member.role}</span>
                  {member.role === 'MEDIA' && (user?.role === 'OWNER' || user?.role === 'ADMIN') ? (
                    <label className="flex items-center gap-1 normal-case tracking-normal text-[#16251F] dark:text-[#F8F7F3]">
                      <input
                        type="checkbox"
                        checked={Boolean(member.canPublishGallery)}
                        onChange={(event) => {
                          void sanctumApi.setGalleryPublisher(member.userId, event.target.checked, actor).then(() => loadMembers());
                        }}
                      />
                      Can publish
                    </label>
                  ) : null}
                  <span
                    className={
                      member.status === 'ACTIVE'
                        ? 'text-[#3D6655] dark:text-[#96A39D]'
                        : 'text-amber-800 dark:text-amber-200'
                    }
                  >
                    {STATUS_LABELS[member.status] || member.status}
                  </span>
                  {member.role !== 'OWNER' && (
                    <button
                      type="button"
                      disabled={removingUserId === member.userId}
                      onClick={() => handleRemove(member)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#B94A48] dark:text-red-400 hover:bg-red-500/10 cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{removingUserId === member.userId ? 'Removing…' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {members.length > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 pt-3">
                <p className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Showing {rangeLabel}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#E5E6E1] dark:border-[#26362F] text-[#16251F] dark:text-[#F8F7F3] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className="text-[11px] font-semibold text-[#68736D] dark:text-[#96A39D]">
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#E5E6E1] dark:border-[#26362F] text-[#16251F] dark:text-[#F8F7F3] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
